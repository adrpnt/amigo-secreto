import type {
  GroupStatus,
  InviteView,
  InviteViewer,
  MembershipStatus,
  SessionUser,
} from '@amigo-secreto/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BusinessEventsService } from '../observability/business-events.service.js';
import {
  RateLimitService,
  rateLimitKey,
} from '../rate-limit/rate-limit.service.js';
import { normalizeInviteCode } from './invite-code.js';
import { isPreviewBot } from './preview-bots.js';

export const INVITE_NOT_FOUND = 'Convite não encontrado.';

const VIEW_WINDOW_MS = 60_000;
const VIEW_LIMIT = 60;
const BOT_VIEW_LIMIT = 600;

// Grupo do código, com o nome de quem organiza e a participação de quem abre
// (nula sem sessão ou sem participação).
const INVITE_SQL = `
  SELECT g.id, g.name, g.status, g."requiresApproval",
    u.name AS "organizerName",
    (SELECT m.status FROM membership m
      WHERE m."groupId" = g.id AND m."userId" = $2) AS "membershipStatus"
  FROM "group" g
  JOIN "user" u ON u.id = g."ownerId"
  WHERE g."inviteCode" = $1`;

type InviteRow = {
  id: string;
  name: string;
  status: GroupStatus;
  requiresApproval: boolean;
  organizerName: string;
  membershipStatus: MembershipStatus | null;
};

// Quem fez a requisição: o IP vem do trust proxy.
export type InviteClient = { ip: string; userAgent: string | undefined };

const VIEWER_BY_STATUS: Record<MembershipStatus, InviteViewer> = {
  PENDING: 'pending',
  APPROVED: 'member',
  REJECTED: 'rejected',
};

@Injectable()
export class InvitesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rateLimit: RateLimitService,
    private readonly events: BusinessEventsService,
  ) {}

  async view(
    code: string,
    user: SessionUser | undefined,
    client: InviteClient,
  ): Promise<InviteView> {
    await this.assertViewLimit(client);
    const normalized = normalizeInviteCode(code);
    if (normalized === null) throw new NotFoundException(INVITE_NOT_FOUND);
    const [row] = await this.dataSource.query<InviteRow[]>(INVITE_SQL, [
      normalized,
      user?.id ?? null,
    ]);
    if (!row) throw new NotFoundException(INVITE_NOT_FOUND);

    const viewer: InviteViewer = !user
      ? 'anonymous'
      : row.membershipStatus === null
        ? 'none'
        : VIEWER_BY_STATUS[row.membershipStatus];
    if (!isPreviewBot(client.userAgent)) {
      this.events.record('invite.viewed', { groupId: row.id });
    }
    return {
      groupName: row.name,
      organizerName: row.organizerName,
      groupStatus: row.status,
      requiresApproval: row.requiresApproval,
      viewer,
      groupId: viewer === 'member' ? row.id : null,
    };
  }

  // Vem antes de procurar o código: acima do limite, todo código recebe 429,
  // e o 429 não revela quais existem. Robôs de preview têm chave própria.
  private assertViewLimit(client: InviteClient): Promise<void> {
    const isBot = isPreviewBot(client.userAgent);
    return this.rateLimit.assertWithinLimits([
      {
        key: rateLimitKey(
          isBot ? 'invites.view_bot' : 'invites.view',
          'ip',
          client.ip,
        ),
        limit: isBot ? BOT_VIEW_LIMIT : VIEW_LIMIT,
        windowMs: VIEW_WINDOW_MS,
      },
    ]);
  }
}
