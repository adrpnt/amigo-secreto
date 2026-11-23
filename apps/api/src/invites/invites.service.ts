import type {
  GroupStatus,
  InviteView,
  InviteViewer,
  JoinResult,
  MembershipStatus,
  SessionUser,
} from '@amigo-secreto/shared';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { EmailService } from '../email/email.service.js';
import { Group } from '../groups/group.entity.js';
import { Membership } from '../groups/membership.entity.js';
import { BusinessEventsService } from '../observability/business-events.service.js';
import {
  RateLimitService,
  rateLimitKey,
} from '../rate-limit/rate-limit.service.js';
import { User } from '../users/user.entity.js';
import { normalizeInviteCode } from './invite-code.js';
import { joinRequestEmail, memberJoinedEmail } from './invite-emails.js';
import { isPreviewBot } from './preview-bots.js';

export const INVITE_NOT_FOUND = 'Convite não encontrado.';
export const DRAWN_GROUP_ENTRY =
  'Este grupo já fez o sorteio e não aceita novas entradas.';
export const CLOSED_GROUP_ENTRY =
  'Este grupo foi encerrado e não aceita novas entradas.';

const VIEW_WINDOW_MS = 60_000;
const VIEW_LIMIT = 60;
const BOT_VIEW_LIMIT = 600;
const JOIN_WINDOW_MS = 60 * 60 * 1000;
const JOIN_LIMIT = 30;

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

function toJoinResult(status: MembershipStatus, groupId: string): JoinResult {
  return { status, groupId: status === 'APPROVED' ? groupId : null };
}

@Injectable()
export class InvitesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rateLimit: RateLimitService,
    private readonly events: BusinessEventsService,
    private readonly email: EmailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
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

  // A trava do grupo põe em fila as entradas simultâneas: a segunda da mesma
  // pessoa encontra a participação criada, e uma entrada que disputa com o
  // sorteio vê o status depois dele. O limite da conta só conta entrada que
  // cria participação, e é desfeito junto com a transação.
  async join(
    code: string,
    user: SessionUser,
    client: InviteClient,
  ): Promise<JoinResult> {
    await this.assertViewLimit(client);
    const normalized = normalizeInviteCode(code);
    if (normalized === null) throw new NotFoundException(INVITE_NOT_FOUND);
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    const { result, created, groupId } = await this.dataSource.transaction(
      async (manager) => {
        const group = await manager
          .getRepository(Group)
          .createQueryBuilder('group')
          .where('group.inviteCode = :code', { code: normalized })
          .setLock('pessimistic_write')
          .getOne();
        if (!group) throw new NotFoundException(INVITE_NOT_FOUND);
        if (group.status === 'DRAWN') {
          throw new ConflictException(DRAWN_GROUP_ENTRY);
        }
        if (group.status === 'CLOSED') {
          throw new ConflictException(CLOSED_GROUP_ENTRY);
        }

        const memberships = manager.getRepository(Membership);
        const existing = await memberships.findOneBy({
          groupId: group.id,
          userId: user.id,
        });
        if (existing) {
          return {
            result: toJoinResult(existing.status, group.id),
            created: false,
            groupId: group.id,
          };
        }

        await this.rateLimit.assertWithinLimits(
          [
            {
              key: rateLimitKey('invites.join', 'user', user.id),
              limit: JOIN_LIMIT,
              windowMs: JOIN_WINDOW_MS,
            },
          ],
          { manager },
        );
        const status: MembershipStatus = group.requiresApproval
          ? 'PENDING'
          : 'APPROVED';
        await memberships.insert({
          groupId: group.id,
          userId: user.id,
          status,
        });
        const organizer = await manager
          .getRepository(User)
          .findOneByOrFail({ id: group.ownerId });
        const notice =
          status === 'PENDING' ? joinRequestEmail : memberJoinedEmail;
        await this.email.enqueueMany(
          [
            notice({
              to: organizer.email,
              name: organizer.name,
              personName: user.name,
              groupName: group.name,
              groupId: group.id,
              webUrl,
            }),
          ],
          { manager },
        );
        return {
          result: toJoinResult(status, group.id),
          created: true,
          groupId: group.id,
        };
      },
    );

    if (created) {
      this.events.record(
        result.status === 'PENDING'
          ? 'membership.requested'
          : 'membership.joined',
        { groupId },
      );
    }
    return result;
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
