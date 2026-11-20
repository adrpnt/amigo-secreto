import { createHmac, timingSafeEqual } from 'node:crypto';

// Valor de cookie com o conteúdo em JSON e a validade, assinado por HMAC:
// <base64url(JSON)>.<HMAC-SHA256(AUTH_SECRET, base64url(JSON))>
type SignedContent<T> = { data: T; exp: number };

function mac(secret: string, encoded: string): Buffer {
  return createHmac('sha256', secret).update(encoded).digest();
}

export function signCookie<T>(secret: string, data: T, ttlMs: number): string {
  const content: SignedContent<T> = { data, exp: Date.now() + ttlMs };
  const encoded = Buffer.from(JSON.stringify(content)).toString('base64url');
  return `${encoded}.${mac(secret, encoded).toString('base64url')}`;
}

// Devolve null para valor ausente, adulterado ou vencido.
export function readSignedCookie<T>(
  secret: string,
  value: string | undefined,
): T | null {
  const [encoded, signature, ...rest] = value?.split('.') ?? [];
  if (!encoded || !signature || rest.length > 0) return null;
  const expected = mac(secret, encoded);
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const content = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as SignedContent<T>;
    return typeof content.exp === 'number' && content.exp > Date.now()
      ? content.data
      : null;
  } catch {
    return null;
  }
}
