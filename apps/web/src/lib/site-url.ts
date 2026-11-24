import type { Metadata } from 'next';
import { connection } from 'next/server';

// Padrão só fora de production; em production a variável é obrigatória.
const DEVELOPMENT_WEB_URL = 'http://localhost:3000';

// URL pública do site. Lida a cada chamada: um build serve qualquer ambiente.
export function siteUrl(): string {
  const webUrl = process.env.WEB_URL;
  if (webUrl) return webUrl;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('WEB_URL não está definida.');
  }
  return DEVELOPMENT_WEB_URL;
}

// Metadados comuns a todas as páginas. O connection() faz o WEB_URL ser lido
// na requisição, não no build.
export async function siteMetadata(): Promise<Metadata> {
  await connection();
  return { metadataBase: new URL(siteUrl()) };
}
