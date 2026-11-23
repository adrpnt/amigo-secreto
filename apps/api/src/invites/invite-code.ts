import { randomInt } from 'node:crypto';

// Sem 0, 1, i, l e o, que se confundem ao ditar.
export const INVITE_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

const INVITE_CODE_LENGTH = 10;
const INVITE_CODE_PATTERN = new RegExp(
  `^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`,
);

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

// A URL aceita maiúsculas; fora do formato, o código não existe e nem chega
// ao banco.
export function normalizeInviteCode(raw: string): string | null {
  const code = raw.toLowerCase();
  return INVITE_CODE_PATTERN.test(code) ? code : null;
}
