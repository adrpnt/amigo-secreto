import {
  formatBrasiliaDate,
  type DrawPanel,
  type GroupDetail,
  type GroupStatus,
} from '@amigo-secreto/shared';

const MINIMUM_APPROVED = 3;

const COUNT_FORMAT = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

export type DrawCondition = { label: string; met: boolean };

export type DrawTabView =
  | 'organizer_open'
  | 'organizer_drawn'
  | 'organizer_closed'
  | 'participant_waiting'
  | 'participant_result';

function approvedCondition(approved: number): DrawCondition {
  if (approved >= MINIMUM_APPROVED) {
    return {
      label: `${COUNT_FORMAT.format(approved)} participantes aprovados`,
      met: true,
    };
  }
  const missing = MINIMUM_APPROVED - approved;
  return {
    label:
      missing === 1
        ? 'Falta 1 pessoa para o mínimo de 3'
        : `Faltam ${missing} pessoas para o mínimo de 3`,
    met: false,
  };
}

function pendingCondition(pending: number): DrawCondition {
  if (pending === 0) return { label: 'Nenhuma entrada pendente', met: true };
  return {
    label:
      pending === 1
        ? '1 pessoa aguarda aprovação'
        : `${COUNT_FORMAT.format(pending)} pessoas aguardam aprovação`,
    met: false,
  };
}

// As três condições do painel, na ordem: aprovados, pendentes, restrições.
export function drawConditionLabels(
  panel: Pick<DrawPanel, 'approved' | 'pending' | 'feasible'>,
): DrawCondition[] {
  return [
    approvedCondition(panel.approved),
    pendingCondition(panel.pending),
    panel.feasible
      ? { label: 'As restrições permitem o sorteio', met: true }
      : { label: 'As restrições não permitem um sorteio válido', met: false },
  ];
}

export function drawnAtLabel(drawnAt: string): string {
  return `Sorteio feito em ${formatBrasiliaDate(drawnAt)}`;
}

// Linha do grupo no papelzinho: o nome e, quando existe, a data da
// confraternização.
export function resultCardSubtitle(
  group: Pick<GroupDetail, 'name' | 'eventAt'>,
): string {
  if (!group.eventAt) return group.name;
  return `${group.name} · ${formatBrasiliaDate(group.eventAt)}`;
}

export function drawTabView(
  isOrganizer: boolean,
  status: GroupStatus,
): DrawTabView {
  if (!isOrganizer) {
    return status === 'OPEN' ? 'participant_waiting' : 'participant_result';
  }
  if (status === 'OPEN') return 'organizer_open';
  if (status === 'DRAWN') return 'organizer_drawn';
  return 'organizer_closed';
}
