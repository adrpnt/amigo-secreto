import { button, greeting, paragraph, siteUrl } from '../email/email-blocks.js';
import type { EmailMessage } from '../email/email.types.js';

// Aviso a uma pessoa com nome conhecido: `name` é quem recebe.
type Notice = {
  to: string;
  name: string;
  groupName: string;
  webUrl: string;
};

// Aviso a quem organiza sobre o que outra pessoa fez no grupo.
type OrganizerNotice = Notice & { personName: string; groupId: string };

function membersUrl(webUrl: string, groupId: string): string {
  return siteUrl(webUrl, `/grupos/${groupId}/participantes`);
}

// Vai a quem talvez nem tenha conta, por isso sem nome na saudação.
export function emailInviteEmail({
  to,
  groupName,
  organizerName,
  inviteCode,
  webUrl,
}: {
  to: string;
  groupName: string;
  organizerName: string;
  inviteCode: string;
  webUrl: string;
}): EmailMessage {
  return {
    to,
    subject: `${organizerName} convidou você para o amigo secreto ${groupName}`,
    blocks: [
      paragraph('Olá.'),
      paragraph(
        `${organizerName} convidou você para participar do amigo secreto ${groupName}. Para entrar, você vai precisar de uma conta no Amigo Secreto.`,
      ),
      button('Ver convite', siteUrl(webUrl, `/convite/${inviteCode}`)),
    ],
  };
}

export function joinRequestEmail({
  to,
  name,
  personName,
  groupName,
  groupId,
  webUrl,
}: OrganizerNotice): EmailMessage {
  return {
    to,
    subject: `${personName} pediu para entrar em ${groupName}`,
    blocks: [
      greeting(name),
      paragraph(
        `${personName} pediu para entrar no grupo ${groupName} no Amigo Secreto.`,
      ),
      button('Ver pedidos', membersUrl(webUrl, groupId)),
    ],
  };
}

export function memberJoinedEmail({
  to,
  name,
  personName,
  groupName,
  groupId,
  webUrl,
}: OrganizerNotice): EmailMessage {
  return {
    to,
    subject: `${personName} entrou em ${groupName}`,
    blocks: [
      greeting(name),
      paragraph(
        `${personName} entrou no grupo ${groupName} pelo link de convite.`,
      ),
      button('Ver participantes', membersUrl(webUrl, groupId)),
    ],
  };
}

export function approvedEmail({
  to,
  name,
  organizerName,
  groupName,
  groupId,
  webUrl,
}: Notice & { organizerName: string; groupId: string }): EmailMessage {
  return {
    to,
    subject: `Você entrou no grupo ${groupName}`,
    blocks: [
      greeting(name),
      paragraph(
        `${organizerName} aprovou sua entrada no grupo ${groupName} no Amigo Secreto.`,
      ),
      button('Ver grupo', siteUrl(webUrl, `/grupos/${groupId}`)),
    ],
  };
}

export function rejectedEmail({
  to,
  name,
  organizerName,
  groupName,
  webUrl,
}: Notice & { organizerName: string }): EmailMessage {
  return {
    to,
    subject: `Sua entrada em ${groupName} não foi aprovada`,
    blocks: [
      greeting(name),
      paragraph(
        `${organizerName} não aprovou sua entrada no grupo ${groupName} no Amigo Secreto.`,
      ),
      button('Ver meus grupos', siteUrl(webUrl, '/grupos')),
    ],
  };
}

export function removedEmail({
  to,
  name,
  organizerName,
  groupName,
  webUrl,
}: Notice & { organizerName: string }): EmailMessage {
  return {
    to,
    subject: `${organizerName} removeu você de ${groupName}`,
    blocks: [
      greeting(name),
      paragraph(
        `${organizerName} removeu você do grupo ${groupName} no Amigo Secreto.`,
      ),
      button('Ver meus grupos', siteUrl(webUrl, '/grupos')),
    ],
  };
}

export function memberLeftEmail({
  to,
  name,
  personName,
  groupName,
  groupId,
  webUrl,
}: OrganizerNotice): EmailMessage {
  return {
    to,
    subject: `${personName} saiu de ${groupName}`,
    blocks: [
      greeting(name),
      paragraph(`${personName} saiu do grupo ${groupName} no Amigo Secreto.`),
      button('Ver participantes', membersUrl(webUrl, groupId)),
    ],
  };
}

export function ownershipEmail({
  to,
  name,
  previousOrganizerName,
  groupName,
  groupId,
  webUrl,
}: Notice & {
  previousOrganizerName: string;
  groupId: string;
}): EmailMessage {
  return {
    to,
    subject: `Agora você organiza ${groupName}`,
    blocks: [
      greeting(name),
      paragraph(
        `${previousOrganizerName} passou para você a organização do grupo ${groupName} no Amigo Secreto.`,
      ),
      button('Ver grupo', siteUrl(webUrl, `/grupos/${groupId}`)),
    ],
  };
}
