import {
  DRAW_MESSAGES,
  type ExclusionPair,
  type ExclusionPerson,
  type ExclusionsResponse,
  validateExclusionInput,
} from '@amigo-secreto/shared';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { DataSource, type EntityManager } from 'typeorm';
import { GroupAccess } from '../groups/group-access.service.js';
import type { Group } from '../groups/group.entity.js';
import { GroupValidationException } from '../groups/group-validation.exception.js';
import { MEMBER_NOT_FOUND } from '../invites/members.service.js';
import { Exclusion } from './exclusion.entity.js';

// Aprovados pelo nome sem acento e sem maiúsculas, como a lista de
// participantes, e pelo id para desempatar.
const APPROVED_SQL = `
  SELECT m.id AS "membershipId", m."userId", u.name
  FROM membership m
  JOIN "user" u ON u.id = m."userId"
  WHERE m."groupId" = $1 AND m.status = 'APPROVED'
  ORDER BY lower(unaccent(u.name)), m.id`;

type ApprovedRow = { membershipId: string; userId: string; name: string };

// Pessoa aprovada com a posição dela na ordem de nome.
export type RankedPerson = ApprovedRow & { rank: number };

export type ExclusionInput = { a?: string | null; b?: string | null };

export type ExclusionsState = {
  people: RankedPerson[];
  pairs: ExclusionPair[];
};

function toPerson(person: RankedPerson): ExclusionPerson {
  return { membershipId: person.membershipId, name: person.name };
}

// Em cada par, `a` é quem vem primeiro na ordem de nome.
function toPair(
  id: string,
  first: RankedPerson,
  second: RankedPerson,
): ExclusionPair {
  const [a, b] = first.rank < second.rank ? [first, second] : [second, first];
  return { id, a: toPerson(a), b: toPerson(b) };
}

// Restrições só mudam com o grupo ABERTO.
function assertEditable(group: Group): void {
  if (group.status === 'DRAWN') {
    throw new ConflictException(DRAW_MESSAGES.exclusionsLocked);
  }
  if (group.status === 'CLOSED') {
    throw new ConflictException(DRAW_MESSAGES.closedGroup);
  }
}

@Injectable()
export class ExclusionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly access: GroupAccess,
  ) {}

  async list(userId: string, groupId: string): Promise<ExclusionsResponse> {
    await this.access.requireOrganizer(userId, groupId);
    const { people, pairs } = await this.state(
      this.dataSource.manager,
      groupId,
    );
    return { participants: people.map(toPerson), pairs };
  }

  // A trava do grupo põe o par em fila com o sorteio: ou entra antes, e o
  // sorteio o respeita, ou depois, e recebe o 409 do status.
  add(
    userId: string,
    groupId: string,
    input: ExclusionInput,
  ): Promise<ExclusionPair> {
    return this.dataSource.transaction(async (manager) => {
      const { group } = await this.access.requireOrganizer(userId, groupId, {
        manager,
        lock: true,
      });
      assertEditable(group);
      const { people, pairs } = await this.state(manager, groupId);

      const a = input.a ?? null;
      const b = input.b ?? null;
      const fields = validateExclusionInput({ a, b }, pairs);
      if (Object.keys(fields).length > 0) {
        throw new GroupValidationException(fields);
      }
      const first = people.find((person) => person.membershipId === a);
      const second = people.find((person) => person.membershipId === b);
      if (!first || !second) throw new NotFoundException(MEMBER_NOT_FOUND);

      const [userAId, userBId] = [first.userId, second.userId].sort();
      const saved = await manager
        .getRepository(Exclusion)
        .save({ groupId, userAId, userBId });
      return toPair(saved.id, first, second);
    });
  }

  // Apagar um par que não existe, de outro grupo ou com id que não é UUID
  // responde como apagado: o resultado pedido já vale.
  async remove(userId: string, groupId: string, pairId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const { group } = await this.access.requireOrganizer(userId, groupId, {
        manager,
        lock: true,
      });
      assertEditable(group);
      if (!isUUID(pairId)) return;
      await manager.getRepository(Exclusion).delete({ id: pairId, groupId });
    });
  }

  // Só pares entre aprovados, em ordem de nome de `a`, depois de `b`.
  async state(
    manager: EntityManager,
    groupId: string,
  ): Promise<ExclusionsState> {
    const rows = await manager.query<ApprovedRow[]>(APPROVED_SQL, [groupId]);
    const people = rows.map((row, rank) => ({ ...row, rank }));
    const byUser = new Map(people.map((person) => [person.userId, person]));

    const exclusions = await manager
      .getRepository(Exclusion)
      .findBy({ groupId });
    const ranked = exclusions.flatMap((exclusion) => {
      const first = byUser.get(exclusion.userAId);
      const second = byUser.get(exclusion.userBId);
      if (!first || !second) return [];
      const [a, b] =
        first.rank < second.rank ? [first, second] : [second, first];
      return [{ id: exclusion.id, a, b }];
    });
    ranked.sort((x, y) => x.a.rank - y.a.rank || x.b.rank - y.b.rank);

    return {
      people,
      pairs: ranked.map((pair) => toPair(pair.id, pair.a, pair.b)),
    };
  }
}
