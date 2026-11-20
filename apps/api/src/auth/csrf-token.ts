import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const CSRF_COOKIE = 'csrf';
export const CSRF_HEADER = 'x-csrf-token';

const NONCE_BYTES = 32;
// Token emitido sem sessão (login, cadastro): assinado para "anon".
const ANONYMOUS = 'anon';

function signature(
  secret: string,
  nonce: string,
  sessionId: string | null,
): Buffer {
  return createHmac('sha256', secret)
    .update(`${nonce}.${sessionId ?? ANONYMOUS}`)
    .digest();
}

// <aleatório>.<HMAC(AUTH_SECRET, aleatório + id da sessão ou "anon")>
export function issueCsrfToken(
  secret: string,
  sessionId: string | null,
): string {
  const nonce = randomBytes(NONCE_BYTES).toString('base64url');
  const mac = signature(secret, nonce, sessionId).toString('base64url');
  return `${nonce}.${mac}`;
}

export function isValidCsrfToken(
  secret: string,
  token: string,
  sessionId: string | null,
): boolean {
  const [nonce, mac, ...rest] = token.split('.');
  if (!nonce || !mac || rest.length > 0) return false;
  const expected = signature(secret, nonce, sessionId);
  const actual = Buffer.from(mac, 'base64url');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
