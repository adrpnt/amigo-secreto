import type { GroupStatus } from './groups.js';

export type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Snake_case: conjunto fechado novo, fora dos status em maiúsculas.
export type InviteViewer =
  'anonymous' | 'none' | 'pending' | 'rejected' | 'member';

export type InviteView = {
  groupName: string;
  organizerName: string;
  groupStatus: GroupStatus;
  requiresApproval: boolean;
  viewer: InviteViewer;
  // Só quando viewer = 'member'.
  groupId: string | null;
};

export type JoinResult = {
  status: MembershipStatus;
  // Só quando a entrada já foi aprovada.
  groupId: string | null;
};

export type MemberItem = {
  membershipId: string;
  name: string;
  avatarUrl: string | null;
  status: MembershipStatus;
  isOrganizer: boolean;
};

export type MembersPage = {
  items: MemberItem[];
  nextCursor: string | null;
  // Total de aprovados do grupo, sem a busca.
  approvedCount: number;
};

export type InviteEmailsResult = { count: number };

export const INVITE_MESSAGES = {
  empty: 'Informe pelo menos um e-mail.',
  invalid: 'Confira estes e-mails:',
  tooMany: 'Envie no máximo 20 e-mails por vez.',
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;
const INVITE_EMAILS_MAX = 20;

export function isEmailAddress(value: string): boolean {
  const email = value.trim();
  return EMAIL_PATTERN.test(email) && email.length <= EMAIL_MAX_LENGTH;
}

// Os válidos saem em minúsculas; os inválidos, como digitados. Repetidos,
// sem diferenciar maiúsculas, contam uma vez, na ordem em que aparecem.
export function parseInviteEmails(text: string): {
  emails: string[];
  invalid: string[];
} {
  const emails: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const entry of text.split(/[,;\s]+/)) {
    const key = entry.toLowerCase();
    if (entry === '' || seen.has(key)) continue;
    seen.add(key);
    if (isEmailAddress(entry)) {
      emails.push(key);
    } else {
      invalid.push(entry);
    }
  }

  return { emails, invalid };
}

// A lista dos inválidos vem antes do limite, que conta só os válidos.
export function validateInviteEmails(text: string): {
  emails: string[];
  fields: { emails?: string };
} {
  const { emails, invalid } = parseInviteEmails(text);

  if (invalid.length > 0) {
    return {
      emails,
      fields: { emails: `${INVITE_MESSAGES.invalid} ${invalid.join(', ')}` },
    };
  }
  if (emails.length === 0) {
    return { emails, fields: { emails: INVITE_MESSAGES.empty } };
  }
  if (emails.length > INVITE_EMAILS_MAX) {
    return { emails, fields: { emails: INVITE_MESSAGES.tooMany } };
  }
  return { emails, fields: {} };
}
