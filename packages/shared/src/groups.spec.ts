import { describe, expect, it } from 'vitest';
import {
  GROUP_MESSAGES,
  normalizeGroupInput,
  validateGroupInput,
  type GroupInput,
} from './groups.js';

const NOW = new Date('2026-11-21T12:00:00.000Z');
const FUTURE_DRAW = '2026-12-10T22:00:00.000Z';
const FUTURE_EVENT = '2026-12-20T22:00:00.000Z';
const PAST = '2026-11-20T12:00:00.000Z';

function input(overrides: Partial<GroupInput> = {}): GroupInput {
  return {
    name: 'Amigo secreto da família',
    description: null,
    giftMinValue: null,
    giftMaxValue: null,
    drawScheduledAt: null,
    eventAt: null,
    eventLocation: null,
    isOnlineEvent: false,
    requiresApproval: false,
    ...overrides,
  };
}

function validate(overrides: Partial<GroupInput>) {
  return validateGroupInput(input(overrides), { now: NOW });
}

describe('validateGroupInput', () => {
  it('aceita nome com 1 e com 80 pontos de código, inclusive emojis', () => {
    expect(validate({ name: 'A' })).toEqual({});
    expect(validate({ name: 'a'.repeat(80) })).toEqual({});
    expect(validate({ name: '🎁'.repeat(80) })).toEqual({});
    expect(validate({ name: '❤️'.repeat(40) })).toEqual({});
  });

  it('recusa nome vazio depois do trim e com 81 pontos de código com a mensagem do nome', () => {
    const message = 'Informe um nome de 1 a 80 caracteres.';
    expect(GROUP_MESSAGES.name).toBe(message);
    expect(
      validateGroupInput(normalizeGroupInput(input({ name: '   ' })), {
        now: NOW,
      }),
    ).toEqual({ name: message });
    expect(validate({ name: 'a'.repeat(81) })).toEqual({ name: message });
    expect(validate({ name: '🎁'.repeat(81) })).toEqual({ name: message });
    expect(validate({ name: '❤️'.repeat(80) })).toEqual({ name: message });
  });

  it('aceita recado com 1000 pontos de código e recusa com 1001', () => {
    expect(validate({ description: '🎄'.repeat(1000) })).toEqual({});
    expect(validate({ description: 'a'.repeat(1001) })).toEqual({
      description: 'Use no máximo 1.000 caracteres.',
    });
  });

  it('aceita valores 1 e 100000 e recusa 0, 100001 e 50.5', () => {
    const message = 'Informe um valor inteiro de R$ 1 a R$ 100.000.';
    expect(validate({ giftMinValue: 1, giftMaxValue: 1 })).toEqual({});
    expect(validate({ giftMinValue: 100000, giftMaxValue: 100000 })).toEqual(
      {},
    );
    expect(validate({ giftMinValue: 1, giftMaxValue: 100000 })).toEqual({});
    expect(validate({ giftMinValue: 0, giftMaxValue: 10 })).toEqual({
      giftMinValue: message,
    });
    expect(validate({ giftMinValue: 100001, giftMaxValue: 100001 })).toEqual({
      giftMinValue: message,
      giftMaxValue: message,
    });
    expect(validate({ giftMinValue: 50.5, giftMaxValue: 60 })).toEqual({
      giftMinValue: message,
    });
    expect(validate({ giftMinValue: 10, giftMaxValue: 0 })).toEqual({
      giftMaxValue: message,
    });
    expect(validate({ giftMinValue: 10, giftMaxValue: 100001 })).toEqual({
      giftMaxValue: message,
    });
    expect(validate({ giftMinValue: 10, giftMaxValue: 50.5 })).toEqual({
      giftMaxValue: message,
    });
  });

  it('recusa o valor final sem o inicial', () => {
    expect(validate({ giftMinValue: null, giftMaxValue: 100 })).toEqual({
      giftMinValue: 'Informe o valor inicial da faixa.',
    });
  });

  it('recusa valor inicial maior que o final e aceita iguais', () => {
    expect(validate({ giftMinValue: 101, giftMaxValue: 100 })).toEqual({
      giftMinValue: 'O valor inicial não pode passar do valor final.',
    });
    expect(validate({ giftMinValue: 100, giftMaxValue: 100 })).toEqual({});
  });

  it('recusa sorteio previsto ou confraternização no passado', () => {
    const message = 'Escolha uma data no futuro.';
    expect(validate({ drawScheduledAt: PAST })).toEqual({
      drawScheduledAt: message,
    });
    expect(validate({ eventAt: PAST })).toEqual({ eventAt: message });
    expect(validate({ drawScheduledAt: FUTURE_DRAW })).toEqual({});
    expect(validate({ eventAt: FUTURE_EVENT })).toEqual({});
  });

  it('aceita data igual à gravada mesmo no passado', () => {
    const saved = { drawScheduledAt: PAST, eventAt: '2026-11-20T13:00:00Z' };
    expect(
      validateGroupInput(
        input({
          drawScheduledAt: '2026-11-20T09:00:00.000-03:00',
          eventAt: '2026-11-20T13:00:00.000Z',
        }),
        { now: NOW, saved },
      ),
    ).toEqual({});
  });

  it('recusa data alterada para o passado mesmo com data gravada', () => {
    const saved = { drawScheduledAt: PAST, eventAt: PAST };
    expect(
      validateGroupInput(
        input({
          drawScheduledAt: '2026-11-19T12:00:00.000Z',
          eventAt: '2026-11-20T12:30:00.000Z',
        }),
        { now: NOW, saved },
      ),
    ).toEqual({
      drawScheduledAt: 'Escolha uma data no futuro.',
      eventAt: 'Escolha uma data no futuro.',
    });
  });

  it('recusa sorteio previsto igual ou depois da confraternização', () => {
    const message = 'O sorteio previsto precisa ser antes da confraternização.';
    expect(
      validate({ drawScheduledAt: FUTURE_EVENT, eventAt: FUTURE_EVENT }),
    ).toEqual({ drawScheduledAt: message });
    expect(
      validate({ drawScheduledAt: FUTURE_EVENT, eventAt: FUTURE_DRAW }),
    ).toEqual({ drawScheduledAt: message });
    expect(
      validate({ drawScheduledAt: FUTURE_DRAW, eventAt: FUTURE_EVENT }),
    ).toEqual({});
  });

  it('aceita local com 200 pontos de código e recusa com 201', () => {
    expect(validate({ eventLocation: '📍'.repeat(200) })).toEqual({});
    expect(validate({ eventLocation: 'a'.repeat(201) })).toEqual({
      eventLocation: 'Use no máximo 200 caracteres.',
    });
  });

  it('devolve uma mensagem por campo quando vários campos falham', () => {
    expect(
      validate({
        name: 'a'.repeat(81),
        description: 'a'.repeat(1001),
        giftMinValue: 0,
        giftMaxValue: null,
        drawScheduledAt: PAST,
        eventAt: FUTURE_EVENT,
        eventLocation: 'a'.repeat(201),
      }),
    ).toEqual({
      name: 'Informe um nome de 1 a 80 caracteres.',
      description: 'Use no máximo 1.000 caracteres.',
      giftMinValue: 'Informe um valor inteiro de R$ 1 a R$ 100.000.',
      drawScheduledAt: 'Escolha uma data no futuro.',
      eventLocation: 'Use no máximo 200 caracteres.',
    });
  });
});

describe('normalizeGroupInput', () => {
  it('tira os espaços das pontas e troca texto vazio por null', () => {
    expect(
      normalizeGroupInput(
        input({
          name: '  Família  ',
          description: '  Recado  ',
          eventLocation: '  Casa da vó  ',
        }),
      ),
    ).toEqual(
      input({
        name: 'Família',
        description: 'Recado',
        eventLocation: 'Casa da vó',
      }),
    );
    expect(
      normalizeGroupInput(input({ description: '   ', eventLocation: '' })),
    ).toEqual(input({ description: null, eventLocation: null }));
  });

  it('grava o máximo igual ao mínimo quando só o mínimo vem', () => {
    expect(
      normalizeGroupInput(input({ giftMinValue: 50, giftMaxValue: null })),
    ).toEqual(input({ giftMinValue: 50, giftMaxValue: 50 }));
    expect(
      normalizeGroupInput(input({ giftMinValue: 50, giftMaxValue: 100 })),
    ).toEqual(input({ giftMinValue: 50, giftMaxValue: 100 }));
    expect(
      normalizeGroupInput(input({ giftMinValue: null, giftMaxValue: 100 })),
    ).toEqual(input({ giftMinValue: null, giftMaxValue: 100 }));
  });

  it('mantém as quebras de linha do recado', () => {
    expect(
      normalizeGroupInput(input({ description: '\n Linha 1\n\nLinha 2 \n' }))
        .description,
    ).toBe('Linha 1\n\nLinha 2');
  });
});
