import {
  DRAW_MESSAGES,
  type DrawPanel,
  type ExclusionPair,
} from '@amigo-secreto/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, MoreThan } from 'typeorm';
import { GroupAccess } from '../groups/group-access.service.js';
import { Group } from '../groups/group.entity.js';
import { JobQueue } from '../jobs/job-queue.service.js';
import { BusinessEventsService } from '../observability/business-events.service.js';
import { TooManyAttemptsException } from '../rate-limit/too-many-attempts.exception.js';
import { Assignment } from './assignment.entity.js';
import { drawAssignments, findBlocked } from './draw-algorithm.js';
import { Draw } from './draw.entity.js';
import {
  type ExclusionsState,
  ExclusionsService,
} from './exclusions.service.js';

const PENDING_COUNT_SQL = `
  SELECT count(*)::int AS count FROM membership
  WHERE "groupId" = $1 AND status = 'PENDING'`;

const MIN_PARTICIPANTS = 3;
const DRAW_LIMIT = 5;
const DRAW_WINDOW_MS = 24 * 60 * 60 * 1000;

// Pares sorteados por INSERT: com 2 parâmetros por linha, fica longe do
// limite de 65.535 parâmetros de uma instrução do Postgres.
const INSERT_BATCH_SIZE = 1000;

export const DRAW_RESULT_EMAIL = 'draw.result_email';

// Só ids: o handler lê o par e os nomes na hora de enviar.
export type DrawResultEmailPayload = { drawId: string; giverUserId: string };

type Feasibility = { feasible: boolean; pairsToReview: ExclusionPair[] };

type Performed = {
  drawnAt: Date;
  participants: number;
  singleCycle: boolean;
  hasExclusions: boolean;
};

// Os pares de restrição pelos ids de pessoa que o algoritmo usa.
function userPairs({ people, pairs }: ExclusionsState): [string, string][] {
  const userOf = new Map(
    people.map((person) => [person.membershipId, person.userId]),
  );
  return pairs.map((pair) => [
    userOf.get(pair.a.membershipId)!,
    userOf.get(pair.b.membershipId)!,
  ]);
}

// Sem distribuição, os pares a revisar são os que envolvem alguém de um
// conjunto que tem menos pessoas permitidas do que o tamanho dele. Sem pares,
// nada a calcular.
function feasibility(state: ExclusionsState): Feasibility {
  if (state.pairs.length === 0) return { feasible: true, pairsToReview: [] };
  const byUser = userPairs(state);
  const blocked = findBlocked(
    state.people.map((person) => person.userId),
    byUser,
  );
  if (blocked === null) return { feasible: true, pairsToReview: [] };
  const blockedUsers = new Set(blocked);
  return {
    feasible: false,
    pairsToReview: state.pairs.filter((_, index) =>
      byUser[index].some((userId) => blockedUsers.has(userId)),
    ),
  };
}

function infeasible(pairsToReview: ExclusionPair[]): ConflictException {
  return new ConflictException({
    statusCode: 409,
    message: DRAW_MESSAGES.infeasible,
    error: 'Conflict',
    pairsToReview,
  });
}

@Injectable()
export class DrawsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly access: GroupAccess,
    private readonly exclusions: ExclusionsService,
    private readonly jobs: JobQueue,
    private readonly events: BusinessEventsService,
  ) {}

  // Só contagens, a viabilidade e os pares de restrição; nunca par sorteado.
  async panel(userId: string, groupId: string): Promise<DrawPanel> {
    const { group } = await this.access.requireOrganizer(userId, groupId);
    const manager = this.dataSource.manager;
    const state = await this.exclusions.state(manager, groupId);
    const pending = await this.pendingCount(manager, groupId);
    const draw = await manager
      .getRepository(Draw)
      .findOneBy({ groupId, status: 'ACTIVE' });

    return {
      status: group.status,
      drawnAt: draw?.createdAt.toISOString() ?? null,
      approved: state.people.length,
      pending,
      ...feasibility(state),
    };
  }

  // A trava do grupo põe em fila sorteios, entradas, saídas e pares
  // simultâneos: quem chega depois encontra o grupo SORTEADO. Rodada, pares,
  // status e e-mails vão juntos na transação; o evento sai depois dela.
  async perform(userId: string, groupId: string): Promise<{ drawnAt: string }> {
    const performed = await this.dataSource.transaction(
      async (manager): Promise<Performed> => {
        const { group } = await this.access.requireOrganizer(userId, groupId, {
          manager,
          lock: true,
        });
        if (group.status === 'DRAWN') {
          throw new ConflictException(DRAW_MESSAGES.alreadyDrawn);
        }
        if (group.status === 'CLOSED') {
          throw new ConflictException(DRAW_MESSAGES.closedGroup);
        }
        const state = await this.exclusions.state(manager, groupId);
        if (state.people.length < MIN_PARTICIPANTS) {
          throw new ConflictException(DRAW_MESSAGES.notEnoughParticipants);
        }
        if ((await this.pendingCount(manager, groupId)) > 0) {
          throw new ConflictException(DRAW_MESSAGES.pendingRequests);
        }
        const { feasible, pairsToReview } = feasibility(state);
        if (!feasible) throw infeasible(pairsToReview);
        await this.assertDrawLimit(manager, groupId);

        const people = state.people.map((person) => person.userId);
        const exclusions = userPairs(state);
        const outcome = drawAssignments(people, exclusions);
        if (outcome.kind === 'blocked') throw infeasible(pairsToReview);

        const draw = await manager.getRepository(Draw).save({
          groupId,
          status: 'ACTIVE',
          singleCycle: outcome.singleCycle,
        });
        const rows = [...outcome.pairs].map(
          ([giverUserId, receiverUserId]) => ({
            drawId: draw.id,
            giverUserId,
            receiverUserId,
          }),
        );
        for (let start = 0; start < rows.length; start += INSERT_BATCH_SIZE) {
          await manager
            .createQueryBuilder()
            .insert()
            .into(Assignment)
            .values(rows.slice(start, start + INSERT_BATCH_SIZE))
            .execute();
        }
        await manager
          .getRepository(Group)
          .update({ id: groupId }, { status: 'DRAWN' });
        await this.jobs.enqueueMany<DrawResultEmailPayload>(
          DRAW_RESULT_EMAIL,
          people.map((giverUserId) => ({ drawId: draw.id, giverUserId })),
          { manager },
        );

        return {
          drawnAt: draw.createdAt,
          participants: people.length,
          singleCycle: outcome.singleCycle,
          hasExclusions: exclusions.length > 0,
        };
      },
    );

    this.events.record('draw.performed', {
      groupId,
      participants: performed.participants,
      singleCycle: performed.singleCycle,
      hasExclusions: performed.hasExclusions,
    });
    return { drawnAt: performed.drawnAt.toISOString() };
  }

  // Até 5 rodadas por grupo em 24 horas, canceladas inclusive. A espera vai
  // até a mais antiga da janela sair dela.
  private async assertDrawLimit(
    manager: EntityManager,
    groupId: string,
  ): Promise<void> {
    const now = Date.now();
    const recent = await manager.getRepository(Draw).find({
      where: { groupId, createdAt: MoreThan(new Date(now - DRAW_WINDOW_MS)) },
      order: { createdAt: 'ASC' },
      select: { id: true, createdAt: true },
    });
    if (recent.length >= DRAW_LIMIT) {
      throw new TooManyAttemptsException(
        recent[0].createdAt.getTime() + DRAW_WINDOW_MS - now,
      );
    }
  }

  private async pendingCount(
    manager: EntityManager,
    groupId: string,
  ): Promise<number> {
    const [{ count }] = await manager.query<{ count: number }[]>(
      PENDING_COUNT_SQL,
      [groupId],
    );
    return count;
  }
}
