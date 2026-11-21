import {
  type GroupDetail,
  type GroupInput,
  normalizeGroupInput,
  type SessionUser,
  validateGroupInput,
} from '@amigo-secreto/shared';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BusinessEventsService } from '../observability/business-events.service.js';
import {
  RateLimitService,
  rateLimitKey,
} from '../rate-limit/rate-limit.service.js';
import type { GroupInputDto } from './dto/group-input.dto.js';
import { Group } from './group.entity.js';
import { GroupValidationException } from './group-validation.exception.js';
import { Membership } from './membership.entity.js';

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
    private readonly rateLimit: RateLimitService,
    private readonly events: BusinessEventsService,
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
          name: input.name,
          description: input.description,
          ownerId: user.id,
          giftMinValue: input.giftMinValue,
          giftMaxValue: input.giftMaxValue,
          drawScheduledAt: input.drawScheduledAt
            ? new Date(input.drawScheduledAt)
            : null,
          eventAt: input.eventAt ? new Date(input.eventAt) : null,
          eventLocation: input.eventLocation,
          isOnlineEvent: input.isOnlineEvent,
          requiresApproval: input.requiresApproval,
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
}
