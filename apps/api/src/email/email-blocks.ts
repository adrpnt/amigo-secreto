import type { EmailBlock } from './email.types.js';

export function paragraph(text: string): EmailBlock {
  return { type: 'paragraph', text };
}

export function button(label: string, url: string): EmailBlock {
  return { type: 'button', label, url };
}

export function greeting(name: string): EmailBlock {
  return paragraph(`Olá, ${name}.`);
}

export function siteUrl(
  webUrl: string,
  path: string,
  query: Record<string, string> = {},
): string {
  const url = new URL(path, webUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.href;
}
