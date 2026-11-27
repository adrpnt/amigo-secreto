import { button, paragraph, siteUrl } from '../email/email-blocks.js';
import type { EmailMessage } from '../email/email.types.js';

function drawUrl(webUrl: string, groupId: string): string {
  return siteUrl(webUrl, `/grupos/${groupId}/sorteio`);
}

// O nome sorteado fica só no corpo: nem o assunto nem a prévia o mostram.
export function drawResultEmail({
  to,
  organizerName,
  groupName,
  groupId,
  receiverName,
  webUrl,
}: {
  to: string;
  organizerName: string;
  groupName: string;
  groupId: string;
  receiverName: string;
  webUrl: string;
}): EmailMessage {
  return {
    to,
    subject: `O sorteio de ${groupName} foi feito`,
    preview: 'Abra num lugar reservado para ver quem você tirou.',
    blocks: [
      paragraph(
        `${organizerName} fez o sorteio do amigo secreto ${groupName}.`,
      ),
      paragraph(`Você tirou: ${receiverName}`),
      paragraph('Só você recebeu este nome. Guarde segredo!'),
      button('Ver no site', drawUrl(webUrl, groupId)),
    ],
  };
}

export function drawCancelledEmail({
  to,
  organizerName,
  groupName,
  groupId,
  webUrl,
}: {
  to: string;
  organizerName: string;
  groupName: string;
  groupId: string;
  webUrl: string;
}): EmailMessage {
  return {
    to,
    subject: `O sorteio de ${groupName} foi cancelado`,
    blocks: [
      paragraph(
        `${organizerName} cancelou o sorteio do amigo secreto ${groupName}. O nome que você tirou não vale mais. Quando houver um novo sorteio, você recebe outro e-mail.`,
      ),
      button('Ver grupo', drawUrl(webUrl, groupId)),
    ],
  };
}

export function drawReminderEmail({
  to,
  groupName,
  groupId,
  webUrl,
}: {
  to: string;
  groupName: string;
  groupId: string;
  webUrl: string;
}): EmailMessage {
  return {
    to,
    subject: `Chegou a hora do sorteio de ${groupName}`,
    blocks: [
      paragraph(
        `O sorteio do amigo secreto ${groupName} estava previsto para agora. Confira quem já entrou e faça o sorteio.`,
      ),
      button('Ir para o sorteio', drawUrl(webUrl, groupId)),
    ],
  };
}
