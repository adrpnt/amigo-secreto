import { describe, expect, it } from 'vitest';
import {
  brasiliaInputToIso,
  formatBrasiliaDate,
  formatBrasiliaDateTime,
  isoToBrasiliaInput,
} from './brasilia-time.js';

describe('brasiliaInputToIso', () => {
  it('converte 2026-12-20T19:00 para 2026-12-20T22:00:00.000Z', () => {
    expect(brasiliaInputToIso('2026-12-20T19:00')).toBe(
      '2026-12-20T22:00:00.000Z',
    );
    // Em 2018 havia horário de verão: o deslocamento é o daquele instante.
    expect(brasiliaInputToIso('2018-12-20T19:00')).toBe(
      '2018-12-20T21:00:00.000Z',
    );
  });
});

describe('isoToBrasiliaInput', () => {
  it('devolve o valor do campo no horário de Brasília', () => {
    expect(isoToBrasiliaInput('2026-12-20T22:00:00.000Z')).toBe(
      '2026-12-20T19:00',
    );
    expect(isoToBrasiliaInput('2026-12-21T02:30:00.000Z')).toBe(
      '2026-12-20T23:30',
    );
  });
});

describe('formatBrasiliaDateTime', () => {
  it('formata 2026-12-20T22:00:00.000Z como 20/12/2026 às 19:00', () => {
    expect(formatBrasiliaDateTime('2026-12-20T22:00:00.000Z')).toBe(
      '20/12/2026 às 19:00',
    );
  });
});

describe('formatBrasiliaDate', () => {
  it('formata a data no horário de Brasília, inclusive perto da meia-noite UTC', () => {
    expect(formatBrasiliaDate('2026-12-20T22:00:00.000Z')).toBe('20/12/2026');
    expect(formatBrasiliaDate('2026-12-21T01:00:00.000Z')).toBe('20/12/2026');
    expect(formatBrasiliaDate('2026-12-20T02:59:00.000Z')).toBe('19/12/2026');
    expect(formatBrasiliaDate('2026-12-20T03:00:00.000Z')).toBe('20/12/2026');
  });
});
