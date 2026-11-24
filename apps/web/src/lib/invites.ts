import type { InviteView } from '@amigo-secreto/shared';
import { apiServerFetch } from './api-server';

export type InviteTooMany = { tooMany: string };

// O convite de um código, lido com o IP e o User-Agent de quem abriu a página:
// a API limita por IP e reconhece os robôs de preview. 404 (código inexistente
// ou trocado) vira null; 429 devolve a mensagem da API para a página mostrar.
export async function getInvite(
  code: string,
): Promise<InviteView | InviteTooMany | null> {
  const response = await apiServerFetch(
    `/invites/${encodeURIComponent(code)}`,
    { forwardClient: true },
  );
  if (response.status === 404) return null;
  if (response.status === 429) {
    const { message } = (await response.json()) as { message: string };
    return { tooMany: message };
  }
  if (response.status !== 200) {
    throw new Error(`A API respondeu ${response.status} em /invites/{code}.`);
  }
  return (await response.json()) as InviteView;
}
