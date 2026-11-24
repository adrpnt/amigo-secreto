import { cookies, headers } from 'next/headers';

const API_TIMEOUT_MS = 5_000;

// Cabeçalhos de quem abriu a página, repassados quando a rota da API limita
// por IP ou depende do cliente.
const CLIENT_HEADERS = ['x-forwarded-for', 'user-agent'];

export type ApiServerFetchOptions = { forwardClient?: boolean };

// Chama a API pelo servidor do site, com os cookies da requisição atual e sem
// cache. Devolve a resposta como veio: cada chamador decide o que é erro.
export async function apiServerFetch(
  path: string,
  { forwardClient = false }: ApiServerFetchOptions = {},
): Promise<Response> {
  // Ler os cookies primeiro deixa a página dinâmica: no build não há
  // API_INTERNAL_URL.
  const cookieHeader = (await cookies()).toString();
  const apiUrl = process.env.API_INTERNAL_URL;
  if (!apiUrl) {
    throw new Error('API_INTERNAL_URL não está definida.');
  }

  const outgoing: Record<string, string> = { cookie: cookieHeader };
  if (forwardClient) {
    const incoming = await headers();
    for (const name of CLIENT_HEADERS) {
      const value = incoming.get(name);
      if (value) outgoing[name] = value;
    }
  }

  return fetch(`${apiUrl}${path}`, {
    headers: outgoing,
    cache: 'no-store',
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
}
