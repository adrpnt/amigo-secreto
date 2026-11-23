import type {
  GroupDetail,
  MemberItem,
  MembersPage,
  MembershipStatus,
  SessionUser,
} from '@amigo-secreto/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { DataSource, type EntityManager } from 'typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { EmailService } from '../email/email.service.js';
import { GroupAccess } from '../groups/group-access.service.js';
import { Group } from '../groups/group.entity.js';
import { toGroupDetail } from '../groups/groups.service.js';
import { Membership } from '../groups/membership.entity.js';
import { BusinessEventsService } from '../observability/business-events.service.js';
import { User } from '../users/user.entity.js';
import { GROUP_NOT_OPEN } from './invites.service.js';
import {
  approvedEmail,
  memberLeftEmail,
  ownershipEmail,
  rejectedEmail,
  removedEmail,
} from './invite-emails.js';

export const INVALID_DATA = 'Dados inválidos.';
export const MEMBER_NOT_FOUND = 'Participante não encontrado.';
export const ORGANIZER_NOT_REMOVABLE = 'Quem organiza não pode ser removido.';
export const CLOSED_GROUP_TRANSFER = 'Grupo encerrado não pode ser alterado.';
export const ORGANIZER_MUST_TRANSFER =
  'Transfira a organização antes de sair do grupo.';

const PAGE_SIZE = 20;

// Ordem da lista: pendentes (0), aprovados (1), recusados (2); dentro de cada
// grupo, pelo nome sem acento e sem maiúsculas, e pelo id para desempatar.
// Quem não organiza só recebe aprovados ($2 falso). A página seguinte começa
// depois do trio do cursor, então aprovar ou recusar alguém entre uma página
// e outra não desloca as pessoas que ainda não foram mostradas.
const MEMBERS_SQL = `
  WITH visible AS (
    SELECT m.id, u.name, u."avatarUrl", m.status,
      m."userId" = g."ownerId" AS "isOrganizer",
      CASE m.status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END
        AS rank,
      lower(unaccent(u.name)) AS "sortName"
    FROM membership m
    JOIN "user" u ON u.id = m."userId"
    JOIN "group" g ON g.id = m."groupId"
    WHERE m."groupId" = $1 AND ($2::boolean OR m.status = 'APPROVED')
  )
  SELECT id, name, "avatarUrl", status, "isOrganizer", rank, "sortName"
  FROM visible
  WHERE ($3::text IS NULL
      OR "sortName" LIKE '%' || lower(unaccent($3::text)) || '%' ESCAPE '\\')
    AND ($4::int IS NULL OR (rank, "sortName", id) > ($4::int, $5::text, $6::uuid))
  ORDER BY rank, "sortName", id
  LIMIT ${PAGE_SIZE + 1}`;

const APPROVED_COUNT_SQL = `
  SELECT count(*)::int AS count FROM membership
  WHERE "groupId" = $1 AND status = 'APPROVED'`;

type MemberRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: MembershipStatus;
  isOrganizer: boolean;
  rank: number;
  sortName: string;
};

type Cursor = [rank: number, sortName: string, id: string];

// Participação do grupo com os dados da pessoa, para a resposta e o aviso.
const MEMBER_SQL = `
  SELECT m.id, m."userId", m.status, u.name, u.email, u."avatarUrl"
  FROM membership m
  JOIN "user" u ON u.id = m."userId"
  WHERE m.id = $1 AND m."groupId" = $2`;

type MemberWithEmail = {
  id: string;
  userId: string;
  status: MembershipStatus;
  name: string;
  email: string;
  avatarUrl: string | null;
};

// O status que a tela mostrava quando a pessoa tocou em aprovar ou recusar.
export type SeenStatus = 'PENDING' | 'REJECTED';

export type MembersQuery = { search?: unknown; cursor?: unknown };

function encodeCursor(row: MemberRow): string {
  const cursor: Cursor = [row.rank, row.sortName, row.id];
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(value: string): Cursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestException(INVALID_DATA);
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 3 ||
    ![0, 1, 2].includes(parsed[0] as number) ||
    typeof parsed[1] !== 'string' ||
    typeof parsed[2] !== 'string' ||
    !isUUID(parsed[2])
  ) {
    throw new BadRequestException(INVALID_DATA);
  }
  return parsed as Cursor;
}

// `%`, `_` e `\` valem como texto no LIKE ... ESCAPE '\'.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

// Um parâmetro repetido na URL chega como lista.
function optionalText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new BadRequestException(INVALID_DATA);
  return value;
}

function toMemberItem(
  row: Pick<MemberRow, 'id' | 'name' | 'avatarUrl' | 'status' | 'isOrganizer'>,
): MemberItem {
  return {
    membershipId: row.id,
    name: row.name,
    avatarUrl: row.avatarUrl,
    status: row.status,
    isOrganizer: row.isOrganizer,
  };
}

@Injectable()
export class MembersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly access: GroupAccess,
    private readonly email: EmailService,
    private readonly events: BusinessEventsService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async list(
    userId: string,
    groupId: string,
    query: MembersQuery,
  ): Promise<MembersPage> {
    const search = optionalText(query.search)?.trim() || null;
    const cursorText = optionalText(query.cursor);
    const cursor = cursorText ? decodeCursor(cursorText) : null;
    const { group } = await this.access.requireMember(userId, groupId);
    const isOrganizer = group.ownerId === userId;

    const rows = await this.dataSource.query<MemberRow[]>(MEMBERS_SQL, [
      groupId,
      isOrganizer,
      search === null ? null : escapeLike(search),
      cursor?.[0] ?? null,
      cursor?.[1] ?? null,
      cursor?.[2] ?? null,
    ]);
    const [{ count }] = await this.dataSource.query<{ count: number }[]>(
      APPROVED_COUNT_SQL,
      [groupId],
    );

    const page = rows.slice(0, PAGE_SIZE);
    return {
      items: page.map(toMemberItem),
      nextCursor:
        rows.length > PAGE_SIZE ? encodeCursor(page[PAGE_SIZE - 1]) : null,
      approvedCount: count,
    };
  }

  approve(
    user: SessionUser,
    groupId: string,
    membershipId: string,
    from: SeenStatus,
  ): Promise<MemberItem> {
    return this.decide(user, groupId, membershipId, from, 'APPROVED');
  }

  reject(
    user: SessionUser,
    groupId: string,
    membershipId: string,
    from: SeenStatus,
  ): Promise<MemberItem> {
    return this.decide(user, groupId, membershipId, from, 'REJECTED');
  }

  // A trava do grupo põe em fila aprovar e recusar simultâneos. O segundo
  // encontra a participação fora do status que a tela mostrava (`from`) e
  // devolve o estado atual sem aviso, então só o primeiro vale, nas duas
  // ordens. Recusar um aprovado é papel do remover: aqui é 404.
  private async decide(
    user: SessionUser,
    groupId: string,
    membershipId: string,
    from: SeenStatus,
    target: 'APPROVED' | 'REJECTED',
  ): Promise<MemberItem> {
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    const { item, changed } = await this.dataSource.transaction(
      async (manager) => {
        const { group } = await this.access.requireOrganizer(user.id, groupId, {
          manager,
          lock: true,
        });
        if (group.status !== 'OPEN') {
          throw new ConflictException(GROUP_NOT_OPEN);
        }
        const member = await this.findMember(manager, group, membershipId);
        if (target === 'REJECTED' && member.status === 'APPROVED') {
          throw new NotFoundException(MEMBER_NOT_FOUND);
        }
        const isOrganizer = member.userId === group.ownerId;
        if (member.status === target || member.status !== from) {
          return {
            item: toMemberItem({ ...member, isOrganizer }),
            changed: false,
          };
        }

        await manager
          .getRepository(Membership)
          .update({ id: member.id }, { status: target });
        const notice = {
          to: member.email,
          name: member.name,
          organizerName: user.name,
          groupName: group.name,
          webUrl,
        };
        await this.email.enqueue(
          target === 'APPROVED'
            ? approvedEmail({ ...notice, groupId: group.id })
            : rejectedEmail(notice),
          { manager },
        );
        return {
          item: toMemberItem({ ...member, status: target, isOrganizer }),
          changed: true,
        };
      },
    );

    if (changed) {
      if (target === 'APPROVED') {
        this.events.record('membership.approved', {
          groupId,
          trigger: 'manual',
        });
      } else {
        this.events.record('membership.rejected', { groupId });
      }
    }
    return item;
  }

  // Remover vira recusa: a pessoa não volta pelo link, e quem organiza pode
  // aprová-la depois. O aviso entra na transação; o evento sai depois dela.
  async remove(
    user: SessionUser,
    groupId: string,
    membershipId: string,
  ): Promise<void> {
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    await this.dataSource.transaction(async (manager) => {
      const { group } = await this.access.requireOrganizer(user.id, groupId, {
        manager,
        lock: true,
      });
      if (group.status !== 'OPEN') {
        throw new ConflictException(GROUP_NOT_OPEN);
      }
      const member = await this.findMember(manager, group, membershipId);
      if (member.userId === group.ownerId) {
        throw new ConflictException(ORGANIZER_NOT_REMOVABLE);
      }
      if (member.status !== 'APPROVED') {
        throw new NotFoundException(MEMBER_NOT_FOUND);
      }

      await manager
        .getRepository(Membership)
        .update({ id: member.id }, { status: 'REJECTED' });
      await this.email.enqueue(
        removedEmail({
          to: member.email,
          name: member.name,
          organizerName: user.name,
          groupName: group.name,
          webUrl,
        }),
        { manager },
      );
    });

    this.events.record('membership.removed', { groupId });
  }

  // Sair apaga a participação: quem sai volta pelo link como quem nunca
  // participou. Quem organiza ouve primeiro que precisa transferir, porque
  // no grupo SORTEADO a transferência ainda é possível.
  async leave(user: SessionUser, groupId: string): Promise<void> {
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    await this.dataSource.transaction(async (manager) => {
      const { group, membership } = await this.access.requireMember(
        user.id,
        groupId,
        { manager, lock: true },
      );
      if (group.ownerId === user.id) {
        throw new ConflictException(ORGANIZER_MUST_TRANSFER);
      }
      if (group.status !== 'OPEN') {
        throw new ConflictException(GROUP_NOT_OPEN);
      }

      await manager.getRepository(Membership).delete({ id: membership.id });
      const organizer = await manager
        .getRepository(User)
        .findOneByOrFail({ id: group.ownerId });
      await this.email.enqueue(
        memberLeftEmail({
          to: organizer.email,
          name: organizer.name,
          personName: user.name,
          groupName: group.name,
          groupId: group.id,
          webUrl,
        }),
        { manager },
      );
    });

    this.events.record('membership.left', { groupId });
  }

  // Quem organizava continua como participante aprovado. A trava põe em
  // fila duas transferências simultâneas: a segunda encontra outra pessoa
  // organizando e recebe 403.
  async transfer(
    user: SessionUser,
    groupId: string,
    membershipId: string,
  ): Promise<GroupDetail> {
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    const { group, recipient } = await this.dataSource.transaction(
      async (manager) => {
        const { group } = await this.access.requireOrganizer(user.id, groupId, {
          manager,
          lock: true,
        });
        if (group.status === 'CLOSED') {
          throw new ConflictException(CLOSED_GROUP_TRANSFER);
        }
        const recipient = await this.findMember(manager, group, membershipId);
        if (
          recipient.status !== 'APPROVED' ||
          recipient.userId === group.ownerId
        ) {
          throw new NotFoundException(MEMBER_NOT_FOUND);
        }

        group.ownerId = recipient.userId;
        await manager
          .getRepository(Group)
          .update({ id: group.id }, { ownerId: recipient.userId });
        await this.email.enqueue(
          ownershipEmail({
            to: recipient.email,
            name: recipient.name,
            previousOrganizerName: user.name,
            groupName: group.name,
            groupId: group.id,
            webUrl,
          }),
          { manager },
        );
        return { group, recipient };
      },
    );

    this.events.record('group.ownership_transferred', { groupId });
    return toGroupDetail(
      group,
      { id: recipient.userId, name: recipient.name },
      user.id,
    );
  }

  // O Postgres recusaria com erro 500 o cast de um id que não é UUID.
  private async findMember(
    manager: EntityManager,
    group: Group,
    membershipId: string,
  ): Promise<MemberWithEmail> {
    if (!isUUID(membershipId)) throw new NotFoundException(MEMBER_NOT_FOUND);
    const [member] = await manager.query<MemberWithEmail[]>(MEMBER_SQL, [
      membershipId,
      group.id,
    ]);
    if (!member) throw new NotFoundException(MEMBER_NOT_FOUND);
    return member;
  }
}
