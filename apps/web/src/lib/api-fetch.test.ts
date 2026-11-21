import { apiFetch } from './api-fetch';

type SentRequest = { url: string; method: string; csrf: string | null };

type Reply = { status: number; setCsrf?: string };

let sent: SentRequest[] = [];

// API falsa: responde na ordem as respostas de cada caminho e grava o cookie
// csrf como faria o Set-Cookie da resposta.
function fakeApi(replies: Record<string, Reply[]>) {
  sent = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      sent.push({
        url: input,
        method: init.method ?? 'GET',
        csrf: headers.get('X-CSRF-Token'),
      });
      const reply = replies[input]?.shift();
      if (!reply) throw new Error(`Chamada inesperada a ${input}`);
      if (reply.setCsrf) document.cookie = `csrf=${reply.setCsrf}; path=/`;
      return Promise.resolve(new Response(null, { status: reply.status }));
    }),
  );
}

function stubLocation(path: string) {
  const url = new URL(path, 'http://localhost:3000');
  const fakeLocation = {
    pathname: url.pathname,
    search: url.search,
    href: url.href,
  };
  vi.stubGlobal('location', fakeLocation);
  return fakeLocation;
}

afterEach(() => {
  document.cookie = 'csrf=; max-age=0; path=/';
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('manda X-CSRF-Token com o valor do cookie csrf', async () => {
    document.cookie = 'csrf=abc.assinatura; path=/';
    fakeApi({ '/api/users/me': [{ status: 200 }] });

    const response = await apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Ana' }),
    });

    expect(response.status).toBe(200);
    expect(sent).toEqual([
      { url: '/api/users/me', method: 'PATCH', csrf: 'abc.assinatura' },
    ]);
  });

  it('busca /api/auth/session antes quando falta o cookie csrf', async () => {
    fakeApi({
      '/api/auth/session': [{ status: 200, setCsrf: 'novo.assinatura' }],
      '/api/auth/logout': [{ status: 204 }],
    });

    const response = await apiFetch('/auth/logout', { method: 'POST' });

    expect(response.status).toBe(204);
    expect(sent).toEqual([
      { url: '/api/auth/session', method: 'GET', csrf: null },
      { url: '/api/auth/logout', method: 'POST', csrf: 'novo.assinatura' },
    ]);
  });

  it('leva a /entrar com o caminho atual quando recebe 401', async () => {
    const fakeLocation = stubLocation('/grupos/abc?aba=mural');
    document.cookie = 'csrf=abc.assinatura; path=/';
    fakeApi({ '/api/users/me': [{ status: 401 }] });

    const response = await apiFetch('/users/me', { method: 'PATCH' });

    expect(response.status).toBe(401);
    expect(fakeLocation.href).toBe(
      `/entrar?next=${encodeURIComponent('/grupos/abc?aba=mural')}`,
    );
  });

  it('busca um token novo e repete uma vez quando recebe 403', async () => {
    document.cookie = 'csrf=velho.assinatura; path=/';
    fakeApi({
      '/api/users/me': [{ status: 403 }, { status: 200 }],
      '/api/auth/session': [{ status: 200, setCsrf: 'novo.assinatura' }],
    });

    const response = await apiFetch('/users/me', { method: 'PATCH' });

    expect(response.status).toBe(200);
    expect(sent).toEqual([
      { url: '/api/users/me', method: 'PATCH', csrf: 'velho.assinatura' },
      { url: '/api/auth/session', method: 'GET', csrf: null },
      { url: '/api/users/me', method: 'PATCH', csrf: 'novo.assinatura' },
    ]);
  });
});
