import { safeNext } from './safe-next';

const API_PREFIX = '/api';
const CSRF_COOKIE = 'csrf';
const CSRF_HEADER = 'X-CSRF-Token';
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export type ApiFetchInit = RequestInit & {
  // false deixa o 401 para quem chamou (login, completar cadastro com Google).
  redirectOnUnauthorized?: boolean;
};

function readCsrfCookie(): string | null {
  for (const pair of document.cookie.split('; ')) {
    const [name, ...value] = pair.split('=');
    if (name === CSRF_COOKIE && value.length > 0) {
      return decodeURIComponent(value.join('='));
    }
  }
  return null;
}

// A API grava o cookie csrf da sessão atual na resposta de /auth/session.
async function refreshCsrfToken(): Promise<string | null> {
  await fetch(`${API_PREFIX}/auth/session`, { method: 'GET' });
  return readCsrfCookie();
}

function send(path: string, init: RequestInit, csrf: string | null) {
  const headers = new Headers(init.headers);
  if (csrf) headers.set(CSRF_HEADER, csrf);
  return fetch(`${API_PREFIX}${path}`, { ...init, headers });
}

export async function apiFetch(
  path: string,
  { redirectOnUnauthorized = true, ...init }: ApiFetchInit = {},
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const needsCsrf = STATE_CHANGING_METHODS.includes(method);

  let csrf = needsCsrf
    ? (readCsrfCookie() ?? (await refreshCsrfToken()))
    : null;
  let response = await send(path, init, csrf);

  if (response.status === 403 && needsCsrf) {
    csrf = await refreshCsrfToken();
    response = await send(path, init, csrf);
  }

  if (response.status === 401 && redirectOnUnauthorized) {
    const next = safeNext(`${location.pathname}${location.search}`);
    // A sessão acabou: a navegação completa descarta o estado do cliente.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.href = `/entrar?next=${encodeURIComponent(next)}`;
  }

  return response;
}
