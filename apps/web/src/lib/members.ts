import type { MembersPage } from '@amigo-secreto/shared';
import { apiServerFetch } from './api-server';

// Primeira página da lista de participantes, para a aba abrir já com ela. A
// API responde 404 a quem não é participante aprovado; isso vira null.
export async function getMembers(groupId: string): Promise<MembersPage | null> {
  const response = await apiServerFetch(
    `/groups/${encodeURIComponent(groupId)}/members`,
  );
  if (response.status === 404) return null;
  if (response.status !== 200) {
    throw new Error(
      `A API respondeu ${response.status} em /groups/{id}/members.`,
    );
  }
  return (await response.json()) as MembersPage;
}
