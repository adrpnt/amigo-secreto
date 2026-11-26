import type { EmailBlock, EmailMessage, RenderedEmail } from './email.types.js';

const BRAND = 'Amigo Secreto';
const FOOTER =
  'Este e-mail foi enviado pelo Amigo Secreto. Não responda esta mensagem.';

const FONT_FAMILY =
  "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const LIGHT = {
  background: '#f1f5f9',
  card: '#ffffff',
  foreground: '#1e293b',
  mutedForeground: '#475569',
  border: '#cbd5e1',
  primary: '#0369a1',
  primaryForeground: '#ffffff',
};

const DARK = {
  background: '#0b1120',
  card: '#1e293b',
  foreground: '#e2e8f0',
  mutedForeground: '#94a3b8',
  border: '#334155',
  primary: '#38bdf8',
  primaryForeground: '#0b1120',
};

const PREVIEW_FILLER = '&#847;&zwnj;&nbsp;'.repeat(100);

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

export function renderEmail(message: EmailMessage): RenderedEmail {
  return {
    to: message.to,
    subject: message.subject,
    html: renderHtml(message.blocks, message.preview),
    text: renderText(message.blocks),
  };
}

function renderText(blocks: EmailBlock[]): string {
  const content = blocks.map((block) =>
    block.type === 'paragraph' ? block.text : `${block.label}: ${block.url}`,
  );
  return [BRAND, ...content, FOOTER].join('\n\n');
}

// Bloco oculto no topo do corpo. Os espaços invisíveis depois do texto
// ocupam o resto da prévia, para o cliente não completá-la com o corpo.
function renderPreview(preview: string | undefined): string {
  if (preview === undefined) return '';
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">${escapeHtml(preview)}${PREVIEW_FILLER}</div>\n`;
}

function renderHtml(blocks: EmailBlock[], preview?: string): string {
  const content = blocks.map(renderBlock).join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .email-bg { background-color: ${DARK.background} !important; }
  .email-card { background-color: ${DARK.card} !important; border-color: ${DARK.border} !important; }
  .email-text { color: ${DARK.foreground} !important; }
  .email-muted { color: ${DARK.mutedForeground} !important; }
  .email-button { background-color: ${DARK.primary} !important; color: ${DARK.primaryForeground} !important; }
}
</style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:${LIGHT.background};">
${renderPreview(preview)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="background-color:${LIGHT.background};">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="email-card" style="width:100%;max-width:600px;background-color:${LIGHT.card};border:1px solid ${LIGHT.border};border-radius:12px;">
<tr><td style="padding:32px;">
<h1 class="email-text" style="margin:0 0 24px;font-family:${FONT_FAMILY};font-size:20px;line-height:28px;font-weight:700;color:${LIGHT.foreground};">${BRAND}</h1>
${content}
</td></tr>
</table>
<p class="email-muted" style="margin:16px 0 0;max-width:600px;font-family:${FONT_FAMILY};font-size:13px;line-height:20px;color:${LIGHT.mutedForeground};">${FOOTER}</p>
</td></tr>
</table>
</body>
</html>`;
}

function renderBlock(block: EmailBlock): string {
  if (block.type === 'paragraph') {
    return `<p class="email-text" style="margin:0 0 16px;font-family:${FONT_FAMILY};font-size:16px;line-height:24px;color:${LIGHT.foreground};">${escapeHtml(block.text)}</p>`;
  }
  return `<p style="margin:8px 0 16px;"><a class="email-button" href="${escapeHtml(block.url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background-color:${LIGHT.primary};color:${LIGHT.primaryForeground};font-family:${FONT_FAMILY};font-size:16px;line-height:24px;font-weight:600;text-decoration:none;">${escapeHtml(block.label)}</a></p>`;
}
