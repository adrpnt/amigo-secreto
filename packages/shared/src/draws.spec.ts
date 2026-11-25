import { describe, expect, it } from 'vitest';
import { DRAW_MESSAGES, validateExclusionInput } from './draws.js';
import type { ExclusionPair } from './draws.js';

const pairs: ExclusionPair[] = [
  {
    id: 'par-1',
    a: { membershipId: 'ana', name: 'Ana Souza' },
    b: { membershipId: 'bruno', name: 'Bruno Lima' },
  },
];

describe('validateExclusionInput', () => {
  it('recusa par sem uma das pessoas com Escolha as duas pessoas do par.', () => {
    const message = 'Escolha as duas pessoas do par.';
    expect(DRAW_MESSAGES.pairIncomplete).toBe(message);
    expect(validateExclusionInput({ a: null, b: 'bruno' }, [])).toEqual({
      a: message,
    });
    expect(validateExclusionInput({ a: 'ana', b: null }, [])).toEqual({
      a: message,
    });
    expect(validateExclusionInput({ a: null, b: null }, [])).toEqual({
      a: message,
    });
    expect(validateExclusionInput({ a: '', b: 'bruno' }, [])).toEqual({
      a: message,
    });
  });

  it('recusa a mesma pessoa duas vezes com Escolha duas pessoas diferentes.', () => {
    const message = 'Escolha duas pessoas diferentes.';
    expect(DRAW_MESSAGES.pairSamePerson).toBe(message);
    expect(validateExclusionInput({ a: 'carla', b: 'carla' }, pairs)).toEqual({
      a: message,
    });
  });

  it('recusa par repetido em qualquer ordem com Esse par já está na lista.', () => {
    const message = 'Esse par já está na lista.';
    expect(DRAW_MESSAGES.pairRepeated).toBe(message);
    expect(validateExclusionInput({ a: 'ana', b: 'bruno' }, pairs)).toEqual({
      a: message,
    });
    expect(validateExclusionInput({ a: 'bruno', b: 'ana' }, pairs)).toEqual({
      a: message,
    });
  });

  it('aceita duas pessoas diferentes fora da lista', () => {
    expect(validateExclusionInput({ a: 'ana', b: 'carla' }, pairs)).toEqual({});
    expect(validateExclusionInput({ a: 'carla', b: 'bruno' }, pairs)).toEqual(
      {},
    );
    expect(validateExclusionInput({ a: 'ana', b: 'bruno' }, [])).toEqual({});
  });
});
