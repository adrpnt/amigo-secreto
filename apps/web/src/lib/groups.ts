import type { GroupDetail, MyGroupsResponse } from '@amigo-secreto/shared';
import { apiServerFetch } from './api-server';

// Grupos ativos e encerrados de quem está logado. Falha da API lança erro: a
// página mostra a mensagem de erro em vez de uma lista vazia.
export async function getMyGroups(): Promise<MyGroupsResponse> {
  const response = await apiServerFetch('/groups');
  if (response.status !== 200) {
    throw new Error(`A API respondeu ${response.status} em /groups.`);
  }
  return (await response.json()) as MyGroupsResponse;
}

// Um grupo de que a pessoa participa. A API responde 404 tanto para grupo
// inexistente quanto para quem não participa; os dois viram null.
export async function getGroup(id: string): Promise<GroupDetail | null> {
  const response = await apiServerFetch(`/groups/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (response.status !== 200) {
    throw new Error(`A API respondeu ${response.status} em /groups/{id}.`);
  }
  return (await response.json()) as GroupDetail;
}
