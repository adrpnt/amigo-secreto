import { cookies } from 'next/headers';

const API_TIMEOUT_MS = 5_000;

// Chama a API pelo servidor do site, com os cookies da requisição atual e sem
// cache. Devolve a resposta como veio: cada chamador decide o que é erro.
export async function apiServerFetch(path: string): Promise<Response> {
  // Ler os cookies primeiro deixa a página dinâmica: no build não há
  // API_INTERNAL_URL.
  const cookieHeader = (await cookies()).toString();
  const apiUrl = process.env.API_INTERNAL_URL;
  if (!apiUrl) {
    throw new Error('API_INTERNAL_URL não está definida.');
  }

  return fetch(`${apiUrl}${path}`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
}
