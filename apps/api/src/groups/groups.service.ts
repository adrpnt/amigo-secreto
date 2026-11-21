import {
  type GroupDetail,
  type GroupInput,
  type GroupStatus,
  type GroupSummary,
  type MyGroupsResponse,
  normalizeGroupInput,
  type SessionUser,
  validateGroupInput,
} from '@amigo-secreto/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, type EntityManager } from 'typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { EmailService } from '../email/email.service.js';
import { BusinessEventsService } from '../observability/business-events.service.js';
import {
  RateLimitService,
  rateLimitKey,
} from '../rate-limit/rate-limit.service.js';
import { User } from '../users/user.entity.js';
import type { GroupInputDto } from './dto/group-input.dto.js';
import { GroupAccess } from './group-access.service.js';
import { Group } from './group.entity.js';
import { groupClosedEmail, groupDeletedEmail } from './group-emails.js';
import { GroupValidationException } from './group-validation.exception.js';
import { Membership } from './membership.entity.js';

// Grupos em que a pessoa tem participação aprovada, com a contagem de
// participantes aprovados, do mais novo para o mais antigo.
const MY_GROUPS_SQL = `
  SELECT g.id, g.name, g.status, g."ownerId", g."drawScheduledAt", g."eventAt",
    g."createdAt",
    (SELECT count(*)::int FROM membership p
      WHERE p."groupId" = g.id AND p.status = 'APPROVED') AS "participantCount"
  FROM "group" g
  JOIN membership m ON m."groupId" = g.id
  WHERE m."userId" = $1 AND m.status = 'APPROVED'
  ORDER BY g."createdAt" DESC, g.id DESC`;

// Quem recebe os avisos do grupo: participantes aprovados, menos quem organiza.
const NOTICE_RECIPIENTS_SQL = `
  SELECT u.name, u.email
  FROM membership m
  JOIN "user" u ON u.id = m."userId"
  WHERE m."groupId" = $1 AND m.status = 'APPROVED' AND m."userId" <> $2
  ORDER BY m."joinedAt", m.id`;

type MyGroupRow = {
  id: string;
  name: string;
  status: GroupStatus;
  ownerId: string;
  drawScheduledAt: Date | null;
  eventAt: Date | null;
  createdAt: Date;
  participantCount: number;
};

export const CLOSED_GROUP_EDIT = 'Grupo encerrado não pode ser editado.';
export const ONLY_DRAWN_CLOSE = 'Só um grupo sorteado pode ser encerrado.';

const CREATE_LIMIT = 20;
const CREATE_WINDOW_MS = 60 * 60 * 1000;

function toGroupInput(body: GroupInputDto): GroupInput {
  return {
    name: body.name,
    description: body.description ?? null,
    giftMinValue: body.giftMinValue ?? null,
    giftMaxValue: body.giftMaxValue ?? null,
    drawScheduledAt: body.drawScheduledAt ?? null,
    eventAt: body.eventAt ?? null,
    eventLocation: body.eventLocation ?? null,
    isOnlineEvent: body.isOnlineEvent ?? false,
    requiresApproval: body.requiresApproval ?? false,
  };
}

function toIso(date: Date | null): string | null {
  return date === null ? null : date.toISOString();
}

function toDate(iso: string | null): Date | null {
  return iso === null ? null : new Date(iso);
}

type GroupFields = Pick<
  Group,
  | 'name'
  | 'description'
  | 'giftMinValue'
  | 'giftMaxValue'
  | 'drawScheduledAt'
  | 'eventAt'
  | 'eventLocation'
  | 'isOnlineEvent'
  | 'requiresApproval'
>;

function toGroupFields(input: GroupInput): GroupFields {
  return {
    name: input.name,
    description: input.description,
    giftMinValue: input.giftMinValue,
    giftMaxValue: input.giftMaxValue,
    drawScheduledAt: toDate(input.drawScheduledAt),
    eventAt: toDate(input.eventAt),
    eventLocation: input.eventLocation,
    isOnlineEvent: input.isOnlineEvent,
    requiresApproval: input.requiresApproval,
  };
}

// Nomes dos campos cujo valor muda; datas comparadas pelo instante.
function changedFields(group: Group, next: GroupFields): string[] {
  return (Object.keys(next) as (keyof GroupFields)[]).filter((field) => {
    const before = group[field];
    const after = next[field];
    if (before instanceof Date || after instanceof Date) {
      return (
        (before as Date | null)?.getTime() !== (after as Date | null)?.getTime()
      );
    }
    return before !== after;
  });
}

export function toGroupDetail(
  group: Group,
  owner: { id: string; name: string },
  viewerId: string,
): GroupDetail {
  return {
    id: group.id,
    name: group.name,
    status: group.status,
    description: group.description,
    giftMinValue: group.giftMinValue,
    giftMaxValue: group.giftMaxValue,
    drawScheduledAt: toIso(group.drawScheduledAt),
    eventAt: toIso(group.eventAt),
    eventLocation: group.eventLocation,
    isOnlineEvent: group.isOnlineEvent,
    requiresApproval: group.requiresApproval,
    owner,
    isOrganizer: group.ownerId === viewerId,
    closedAt: toIso(group.closedAt),
    createdAt: group.createdAt.toISOString(),
  };
}

@Injectable()
export class GroupsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly access: GroupAccess,
    private readonly rateLimit: RateLimitService,
    private readonly events: BusinessEventsService,
    private readonly email: EmailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async create(user: SessionUser, body: GroupInputDto): Promise<GroupDetail> {
    const input = normalizeGroupInput(toGroupInput(body));
    const fields = validateGroupInput(input, { now: new Date() });
    if (Object.keys(fields).length > 0) {
      throw new GroupValidationException(fields);
    }

    // Só criação válida conta no limite. O consume roda fora da transação:
    // uma criação que falha no banco depois dele também conta.
    await this.rateLimit.assertWithinLimits([
      {
        key: rateLimitKey('groups.create', 'user', user.id),
        limit: CREATE_LIMIT,
        windowMs: CREATE_WINDOW_MS,
      },
    ]);

    const group = await this.dataSource.transaction(async (manager) => {
      const groups = manager.getRepository(Group);
      const created = await groups.save(
        groups.create({
          ...toGroupFields(input),
          ownerId: user.id,
          status: 'OPEN',
          closedAt: null,
        }),
      );
      await manager.getRepository(Membership).insert({
        groupId: created.id,
        userId: user.id,
        status: 'APPROVED',
      });
      return created;
    });

    this.events.record('group.created', { groupId: group.id });
    return toGroupDetail(group, { id: user.id, name: user.name }, user.id);
  }

  async listMine(userId: string): Promise<MyGroupsResponse> {
    const rows = await this.dataSource.query<MyGroupRow[]>(MY_GROUPS_SQL, [
      userId,
    ]);
    const summaries = rows.map((row): GroupSummary => ({
      id: row.id,
      name: row.name,
      status: row.status,
      participantCount: row.participantCount,
      isOrganizer: row.ownerId === userId,
      drawScheduledAt: toIso(row.drawScheduledAt),
      eventAt: toIso(row.eventAt),
      createdAt: row.createdAt.toISOString(),
    }));
    return {
      active: summaries.filter((group) => group.status !== 'CLOSED'),
      closed: summaries.filter((group) => group.status === 'CLOSED'),
    };
  }

  async get(userId: string, groupId: string): Promise<GroupDetail> {
    const { group } = await this.access.requireMember(userId, groupId);
    const owner = await this.dataSource
      .getRepository(User)
      .findOneByOrFail({ id: group.ownerId });
    return toGroupDetail(group, { id: owner.id, name: owner.name }, userId);
  }

  async update(
    user: SessionUser,
    groupId: string,
    body: GroupInputDto,
  ): Promise<GroupDetail> {
    const input = normalizeGroupInput(toGroupInput(body));

    const { group, changed } = await this.dataSource.transaction(
      async (manager) => {
        const { group } = await this.access.requireOrganizer(user.id, groupId, {
          manager,
          lock: true,
        });
        if (group.status === 'CLOSED') {
          throw new ConflictException(CLOSED_GROUP_EDIT);
        }
        const fields = validateGroupInput(input, {
          now: new Date(),
          saved: {
            drawScheduledAt: toIso(group.drawScheduledAt),
            eventAt: toIso(group.eventAt),
          },
        });
        if (Object.keys(fields).length > 0) {
          throw new GroupValidationException(fields);
        }

        const next = toGroupFields(input);
        const changed = changedFields(group, next);
        if (changed.length > 0) {
          Object.assign(group, next);
          await manager.getRepository(Group).save(group);
        }
        return { group, changed };
      },
    );

    if (changed.length > 0) {
      this.events.record('group.updated', {
        groupId: group.id,
        fields: changed.join(','),
      });
    }
    return toGroupDetail(group, { id: user.id, name: user.name }, user.id);
  }

  // Os avisos entram na transação da exclusão: se ela falha, nenhum sai.
  // Um segundo pedido simultâneo espera a trava e encontra o grupo apagado.
  async remove(user: SessionUser, groupId: string): Promise<void> {
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    const status = await this.dataSource.transaction(async (manager) => {
      const { group } = await this.access.requireOrganizer(user.id, groupId, {
        manager,
        lock: true,
      });
      const recipients = await this.noticeRecipients(manager, group);
      await this.email.enqueueMany(
        recipients.map((recipient) =>
          groupDeletedEmail({
            to: recipient.email,
            name: recipient.name,
            groupName: group.name,
            organizerName: user.name,
            webUrl,
          }),
        ),
        { manager },
      );
      await manager.getRepository(Group).delete({ id: group.id });
      return group.status;
    });

    this.events.record('group.deleted', { groupId, status });
  }

  // Como na exclusão: avisos na mesma transação, e o segundo pedido
  // simultâneo espera a trava e encontra o grupo já encerrado (409).
  async close(user: SessionUser, groupId: string): Promise<GroupDetail> {
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    const group = await this.dataSource.transaction(async (manager) => {
      const { group } = await this.access.requireOrganizer(user.id, groupId, {
        manager,
        lock: true,
      });
      if (group.status !== 'DRAWN') {
        throw new ConflictException(ONLY_DRAWN_CLOSE);
      }
      group.status = 'CLOSED';
      group.closedAt = new Date();
      await manager.getRepository(Group).save(group);

      const recipients = await this.noticeRecipients(manager, group);
      await this.email.enqueueMany(
        recipients.map((recipient) =>
          groupClosedEmail({
            to: recipient.email,
            name: recipient.name,
            groupName: group.name,
            organizerName: user.name,
            groupId: group.id,
            webUrl,
          }),
        ),
        { manager },
      );
      return group;
    });

    this.events.record('group.closed', {
      groupId: group.id,
      trigger: 'manual',
    });
    return toGroupDetail(group, { id: user.id, name: user.name }, user.id);
  }

  private noticeRecipients(
    manager: EntityManager,
    group: Group,
  ): Promise<{ name: string; email: string }[]> {
    return manager.query(NOTICE_RECIPIENTS_SQL, [group.id, group.ownerId]);
  }
}
