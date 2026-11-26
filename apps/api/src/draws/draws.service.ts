import type { DrawPanel, ExclusionPair } from '@amigo-secreto/shared';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GroupAccess } from '../groups/group-access.service.js';
import { findBlocked } from './draw-algorithm.js';
import { Draw } from './draw.entity.js';
import {
  type ExclusionsState,
  ExclusionsService,
} from './exclusions.service.js';

const PENDING_COUNT_SQL = `
  SELECT count(*)::int AS count FROM membership
  WHERE "groupId" = $1 AND status = 'PENDING'`;

type Feasibility = { feasible: boolean; pairsToReview: ExclusionPair[] };

// Sem distribuição, os pares a revisar são os que envolvem alguém de um
// conjunto que tem menos pessoas permitidas do que o tamanho dele. Sem pares,
// nada a calcular.
function feasibility({ people, pairs }: ExclusionsState): Feasibility {
  if (pairs.length === 0) return { feasible: true, pairsToReview: [] };
  const userOf = new Map(
    people.map((person) => [person.membershipId, person.userId]),
  );
  const userPair = (pair: ExclusionPair): [string, string] => [
    userOf.get(pair.a.membershipId)!,
    userOf.get(pair.b.membershipId)!,
  ];
  const blocked = findBlocked(
    people.map((person) => person.userId),
    pairs.map(userPair),
  );
  if (blocked === null) return { feasible: true, pairsToReview: [] };
  const blockedUsers = new Set(blocked);
  return {
    feasible: false,
    pairsToReview: pairs.filter((pair) =>
      userPair(pair).some((userId) => blockedUsers.has(userId)),
    ),
  };
}

@Injectable()
export class DrawsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly access: GroupAccess,
    private readonly exclusions: ExclusionsService,
  ) {}

  // Só contagens, a viabilidade e os pares de restrição; nunca par sorteado.
  async panel(userId: string, groupId: string): Promise<DrawPanel> {
    const { group } = await this.access.requireOrganizer(userId, groupId);
    const manager = this.dataSource.manager;
    const state = await this.exclusions.state(manager, groupId);
    const [{ count: pending }] = await manager.query<{ count: number }[]>(
      PENDING_COUNT_SQL,
      [groupId],
    );
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
}
