import {
  cardDateLine,
  formatGiftValue,
  participantsLabel,
} from './group-format';

// 20/12/2026 às 19:00 e 10/12/2026 às 23:30 no horário de Brasília; a segunda
// já é dia 11 em UTC.
const EVENT_AT = '2026-12-20T22:00:00.000Z';
const DRAW_AT = '2026-12-11T02:30:00.000Z';

describe('formatGiftValue', () => {
  it('mostra R$ 50 quando mínimo e máximo são iguais', () => {
    expect(formatGiftValue(50, 50)).toBe('R$ 50');
  });

  it('mostra R$ 50 a R$ 100 numa faixa', () => {
    expect(formatGiftValue(50, 100)).toBe('R$ 50 a R$ 100');
  });

  it('mostra R$ 1.500 com ponto de milhar', () => {
    expect(formatGiftValue(1500, 1500)).toBe('R$ 1.500');
    expect(formatGiftValue(1000, 100000)).toBe('R$ 1.000 a R$ 100.000');
  });
});

describe('participantsLabel', () => {
  it('escreve 1 participante e N participantes', () => {
    expect(participantsLabel(1)).toBe('1 participante');
    expect(participantsLabel(2)).toBe('2 participantes');
    expect(participantsLabel(12)).toBe('12 participantes');
  });
});

describe('cardDateLine', () => {
  it('mostra Sorteio em dd/mm/aaaa para grupo ABERTO', () => {
    expect(
      cardDateLine({
        status: 'OPEN',
        drawScheduledAt: DRAW_AT,
        eventAt: EVENT_AT,
      }),
    ).toBe('Sorteio em 10/12/2026');
  });

  it('mostra Confraternização em dd/mm/aaaa para grupo SORTEADO ou ENCERRADO', () => {
    for (const status of ['DRAWN', 'CLOSED'] as const) {
      expect(
        cardDateLine({ status, drawScheduledAt: DRAW_AT, eventAt: EVENT_AT }),
      ).toBe('Confraternização em 20/12/2026');
    }
  });

  it('mostra Sem data definida quando a data do status não existe', () => {
    expect(
      cardDateLine({
        status: 'OPEN',
        drawScheduledAt: null,
        eventAt: EVENT_AT,
      }),
    ).toBe('Sem data definida');
    expect(
      cardDateLine({
        status: 'DRAWN',
        drawScheduledAt: DRAW_AT,
        eventAt: null,
      }),
    ).toBe('Sem data definida');
    expect(
      cardDateLine({
        status: 'CLOSED',
        drawScheduledAt: DRAW_AT,
        eventAt: null,
      }),
    ).toBe('Sem data definida');
  });
});
