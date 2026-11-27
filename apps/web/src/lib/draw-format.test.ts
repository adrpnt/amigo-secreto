import type { DrawPanel } from '@amigo-secreto/shared';
import {
  drawConditionLabels,
  drawnAtLabel,
  drawTabView,
  resultCardSubtitle,
} from './draw-format';

// 10/12/2026 às 23:30 no horário de Brasília; já é dia 11 em UTC.
const LATE_NIGHT = '2026-12-11T02:30:00.000Z';

function panel(overrides: Partial<DrawPanel>): DrawPanel {
  return {
    status: 'OPEN',
    drawnAt: null,
    approved: 4,
    pending: 0,
    feasible: true,
    pairsToReview: [],
    ...overrides,
  };
}

describe('drawConditionLabels', () => {
  it('escreve N participantes aprovados com 3 ou mais', () => {
    expect(drawConditionLabels(panel({ approved: 3 }))[0]).toEqual({
      label: '3 participantes aprovados',
      met: true,
    });
    expect(drawConditionLabels(panel({ approved: 1000 }))[0]).toEqual({
      label: '1.000 participantes aprovados',
      met: true,
    });
  });

  it('escreve Falta 1 pessoa e Faltam N pessoas para o mínimo de 3', () => {
    expect(drawConditionLabels(panel({ approved: 2 }))[0]).toEqual({
      label: 'Falta 1 pessoa para o mínimo de 3',
      met: false,
    });
    expect(drawConditionLabels(panel({ approved: 1 }))[0]).toEqual({
      label: 'Faltam 2 pessoas para o mínimo de 3',
      met: false,
    });
  });

  it('escreve Nenhuma entrada pendente, 1 pessoa aguarda aprovação e N pessoas aguardam aprovação', () => {
    expect(drawConditionLabels(panel({ pending: 0 }))[1]).toEqual({
      label: 'Nenhuma entrada pendente',
      met: true,
    });
    expect(drawConditionLabels(panel({ pending: 1 }))[1]).toEqual({
      label: '1 pessoa aguarda aprovação',
      met: false,
    });
    expect(drawConditionLabels(panel({ pending: 3 }))[1]).toEqual({
      label: '3 pessoas aguardam aprovação',
      met: false,
    });
    expect(drawConditionLabels(panel({ pending: 1200 }))[1]).toEqual({
      label: '1.200 pessoas aguardam aprovação',
      met: false,
    });
  });

  it('escreve se as restrições permitem o sorteio', () => {
    expect(drawConditionLabels(panel({ feasible: true }))[2]).toEqual({
      label: 'As restrições permitem o sorteio',
      met: true,
    });
    expect(drawConditionLabels(panel({ feasible: false }))[2]).toEqual({
      label: 'As restrições não permitem um sorteio válido',
      met: false,
    });
    expect(drawConditionLabels(panel({}))).toHaveLength(3);
  });
});

describe('drawnAtLabel', () => {
  it('escreve Sorteio feito em dd/mm/aaaa no horário de Brasília', () => {
    expect(drawnAtLabel(LATE_NIGHT)).toBe('Sorteio feito em 10/12/2026');
  });
});

describe('resultCardSubtitle', () => {
  it('junta o grupo e a data da confraternização quando existe', () => {
    expect(
      resultCardSubtitle({ name: 'Família Souza', eventAt: LATE_NIGHT }),
    ).toBe('Família Souza · 10/12/2026');
    expect(resultCardSubtitle({ name: 'Família Souza', eventAt: null })).toBe(
      'Família Souza',
    );
  });
});

describe('drawTabView', () => {
  it('escolhe a visão pelo papel e pelo status', () => {
    expect(drawTabView(true, 'OPEN')).toBe('organizer_open');
    expect(drawTabView(true, 'DRAWN')).toBe('organizer_drawn');
    expect(drawTabView(true, 'CLOSED')).toBe('organizer_closed');
    expect(drawTabView(false, 'OPEN')).toBe('participant_waiting');
    expect(drawTabView(false, 'DRAWN')).toBe('participant_result');
    expect(drawTabView(false, 'CLOSED')).toBe('participant_result');
  });
});
