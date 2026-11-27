import type { DrawPanel, ExclusionsResponse } from '@amigo-secreto/shared';
import { apiServerFetch } from './api-server';

// Painel do sorteio de quem organiza. 404 (grupo inexistente ou de que a
// pessoa não participa) vira null; outro status lança.
export async function getDrawPanel(groupId: string): Promise<DrawPanel | null> {
  const response = await apiServerFetch(
    `/groups/${encodeURIComponent(groupId)}/draw`,
  );
  if (response.status === 404) return null;
  if (response.status !== 200) {
    throw new Error(`A API respondeu ${response.status} em /groups/{id}/draw.`);
  }
  return (await response.json()) as DrawPanel;
}

// Participantes aprovados e pares de restrição, só para quem organiza.
export async function getExclusions(
  groupId: string,
): Promise<ExclusionsResponse | null> {
  const response = await apiServerFetch(
    `/groups/${encodeURIComponent(groupId)}/exclusions`,
  );
  if (response.status === 404) return null;
  if (response.status !== 200) {
    throw new Error(
      `A API respondeu ${response.status} em /groups/{id}/exclusions.`,
    );
  }
  return (await response.json()) as ExclusionsResponse;
}
