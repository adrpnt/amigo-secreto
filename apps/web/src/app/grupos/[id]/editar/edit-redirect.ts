import type { GroupDetail } from '@amigo-secreto/shared';

// Só quem organiza edita, e só grupo ABERTO ou SORTEADO. Nos outros casos a
// edição leva de volta à página do grupo; null deixa abrir o formulário.
export function editRedirect(group: GroupDetail): string | null {
  if (!group.isOrganizer || group.status === 'CLOSED') {
    return `/grupos/${group.id}`;
  }
  return null;
}
