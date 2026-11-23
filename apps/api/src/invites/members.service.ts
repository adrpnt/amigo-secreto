import type {
  MemberItem,
  MembersPage,
  MembershipStatus,
} from '@amigo-secreto/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { DataSource } from 'typeorm';
import { GroupAccess } from '../groups/group-access.service.js';

export const INVALID_DATA = 'Dados inválidos.';

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

function toMemberItem(row: MemberRow): MemberItem {
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
}
