import {
  INVITE_CODE_ALPHABET,
  generateInviteCode,
  normalizeInviteCode,
} from './invite-code.js';

const CODE_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{10}$/;

describe('código do convite', () => {
  it('gera 10 caracteres do alfabeto sem 0, 1, i, l e o', () => {
    expect(INVITE_CODE_ALPHABET).toBe('23456789abcdefghjkmnpqrstuvwxyz');
    for (let i = 0; i < 200; i++) {
      expect(generateInviteCode()).toMatch(CODE_PATTERN);
    }
  });

  it('gera códigos diferentes em 1000 chamadas', () => {
    const codes = new Set(
      Array.from({ length: 1000 }, () => generateInviteCode()),
    );
    expect(codes.size).toBe(1000);
  });

  it('normaliza maiúsculas para minúsculas', () => {
    expect(normalizeInviteCode('AB23CD45EF')).toBe('ab23cd45ef');
    expect(normalizeInviteCode('ab23cd45ef')).toBe('ab23cd45ef');
    expect(normalizeInviteCode('Ab23cD45eF')).toBe('ab23cd45ef');
  });

  it('recusa código com tamanho ou caractere fora do alfabeto', () => {
    expect(normalizeInviteCode('')).toBeNull();
    expect(normalizeInviteCode('ab23cd45e')).toBeNull();
    expect(normalizeInviteCode('ab23cd45efg')).toBeNull();
    for (const outside of ['0', '1', 'i', 'l', 'o', 'I', 'L', 'O', '-', ' ']) {
      expect(normalizeInviteCode(`ab23cd45e${outside}`)).toBeNull();
    }
  });
});
