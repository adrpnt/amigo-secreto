import { formatBrasiliaDate, type GroupSummary } from '@amigo-secreto/shared';

const INTEGER_FORMAT = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

function formatReais(value: number): string {
  return `R$ ${INTEGER_FORMAT.format(value)}`;
}

// "R$ 50" quando mínimo e máximo são iguais; "R$ 50 a R$ 100" numa faixa.
export function formatGiftValue(min: number, max: number): string {
  if (min === max) return formatReais(min);
  return `${formatReais(min)} a ${formatReais(max)}`;
}

export function participantsLabel(count: number): string {
  return count === 1 ? '1 participante' : `${count} participantes`;
}

// Grupo ABERTO mostra a data do sorteio previsto; SORTEADO e ENCERRADO, a da
// confraternização.
export function cardDateLine(
  summary: Pick<GroupSummary, 'status' | 'drawScheduledAt' | 'eventAt'>,
): string {
  if (summary.status === 'OPEN') {
    return summary.drawScheduledAt
      ? `Sorteio em ${formatBrasiliaDate(summary.drawScheduledAt)}`
      : 'Sem data definida';
  }
  return summary.eventAt
    ? `Confraternização em ${formatBrasiliaDate(summary.eventAt)}`
    : 'Sem data definida';
}
