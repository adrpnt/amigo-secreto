export const DEFAULT_NEXT = '/perfil';

const AUTH_PAGES = ['/entrar', '/cadastro'];

// Origem fictícia só para o parser: um destino que sai dela é de outro site.
const BASE = 'http://amigo-secreto.invalid';

// Mesmas regras do safeNext da API: só caminho do próprio site, fora das
// páginas de entrada; o resto vira /perfil.
export function safeNext(value: string | null | undefined): string {
  if (!value?.startsWith('/')) return DEFAULT_NEXT;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return DEFAULT_NEXT;
  }
  if (url.origin !== BASE || AUTH_PAGES.includes(url.pathname)) {
    return DEFAULT_NEXT;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
