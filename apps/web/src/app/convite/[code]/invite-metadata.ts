import type { InviteView } from '@amigo-secreto/shared';
import type { Metadata } from 'next';
import type { InviteTooMany } from '@/lib/invites';

const GENERIC_TITLE = 'Convite do Amigo Secreto';
const BRAND_DESCRIPTION = 'Sorteio, lista de desejos e mensagens secretas.';
const PREVIEW_IMAGE = { url: '/og/convite.png', width: 1200, height: 630 };

// Título, descrição e imagem do preview do convite. Código inválido e 429 não
// dizem nada do grupo: o preview fica com o título genérico e a marca.
export function inviteMetadata(
  invite: InviteView | InviteTooMany | null,
): Metadata {
  const isValid = invite !== null && !('tooMany' in invite);
  const title = isValid ? `Convite: ${invite.groupName}` : GENERIC_TITLE;
  const description = isValid
    ? `${invite.organizerName} convidou você para o amigo secreto.`
    : BRAND_DESCRIPTION;
  return {
    title,
    description,
    openGraph: { title, description, images: [PREVIEW_IMAGE] },
  };
}
