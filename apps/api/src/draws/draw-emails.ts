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
