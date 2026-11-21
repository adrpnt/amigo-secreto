import { button, greeting, paragraph, siteUrl } from '../email/email-blocks.js';
import type { EmailMessage } from '../email/email.types.js';

type GroupNotice = {
  to: string;
  name: string;
  groupName: string;
  organizerName: string;
  webUrl: string;
};

export function groupDeletedEmail({
  to,
  name,
  groupName,
  organizerName,
  webUrl,
}: GroupNotice): EmailMessage {
  return {
    to,
    subject: `O grupo ${groupName} foi excluído`,
    blocks: [
      greeting(name),
      paragraph(
        `${organizerName} excluiu o grupo ${groupName} no Amigo Secreto. As informações do grupo foram apagadas.`,
      ),
      button('Ver meus grupos', siteUrl(webUrl, '/grupos')),
    ],
  };
}

export function groupClosedEmail({
  to,
  name,
  groupName,
  organizerName,
  groupId,
  webUrl,
}: GroupNotice & { groupId: string }): EmailMessage {
  return {
    to,
    subject: `O grupo ${groupName} foi encerrado`,
    blocks: [
      greeting(name),
      paragraph(
        `${organizerName} encerrou o grupo ${groupName} no Amigo Secreto. Ele continua em Meus grupos, na seção Encerrados.`,
      ),
      button('Ver grupo', siteUrl(webUrl, `/grupos/${groupId}`)),
    ],
  };
}
