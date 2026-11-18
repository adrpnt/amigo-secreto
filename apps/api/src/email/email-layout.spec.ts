import { renderEmail } from './email-layout.js';
import type { EmailMessage } from './email.types.js';

const FOOTER =
  'Este e-mail foi enviado pelo Amigo Secreto. Não responda esta mensagem.';

const MESSAGE: EmailMessage = {
  to: 'ana@example.com',
  subject: 'Você foi convidada',
  blocks: [
    { type: 'paragraph', text: 'Olá, Ana.' },
    { type: 'paragraph', text: 'O sorteio do grupo Família já aconteceu.' },
    { type: 'button', label: 'Ver resultado', url: 'https://exemplo.com/r' },
  ],
};

function withoutStyleBlock(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/g, '');
}

function decodeEntities(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

function visibleLines(html: string): string[] {
  const body = /<body[\s\S]*<\/body>/.exec(html)?.[0] ?? '';
  return decodeEntities(body.replace(/<[^>]+>/g, '\n'))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function openingTag(html: string, pattern: RegExp): string {
  const tag = pattern.exec(withoutStyleBlock(html))?.[0];
  if (tag === undefined) {
    throw new Error(`Elemento não encontrado: ${pattern}`);
  }
  return tag;
}

function attribute(tag: string, name: string): string {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1] ?? '';
}

function inlineStyle(tag: string): string {
  return attribute(tag, 'style').replace(/\s/g, '');
}

function darkDeclarations(html: string, tag: string): string {
  const style = /<style[^>]*>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '';
  const media = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*)\}/.exec(
    style,
  )?.[1];
  if (media === undefined) {
    throw new Error('Bloco prefers-color-scheme: dark não encontrado');
  }
  const classes = attribute(tag, 'class').split(/\s+/).filter(Boolean);
  const rules = [...media.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)];

  return rules
    .filter(([, className]) => classes.includes(className))
    .map(([, , declarations]) => declarations.replace(/\s/g, ''))
    .join(';');
}

const ELEMENTS = {
  body: /<body\b[^>]*>/,
  card: /<table\b[^>]*width="600"[^>]*>/,
  header: /<h1\b[^>]*>/,
  paragraph: /<p\b[^>]*>(?=Olá)/,
  footer: /<p\b[^>]*>(?=Este e-mail)/,
  button: /<a\b[^>]*>/,
};

describe('renderEmail', () => {
  it('produz HTML e texto com o mesmo conteúdo', () => {
    const message: EmailMessage = {
      ...MESSAGE,
      blocks: MESSAGE.blocks.filter((block) => block.type === 'paragraph'),
    };

    const email = renderEmail(message);

    expect(visibleLines(email.html)).toEqual([
      'Amigo Secreto',
      'Olá, Ana.',
      'O sorteio do grupo Família já aconteceu.',
      FOOTER,
    ]);
    expect(email.text.split('\n').filter((line) => line !== '')).toEqual(
      visibleLines(email.html),
    );
    expect(email.to).toBe('ana@example.com');
    expect(email.subject).toBe('Você foi convidada');
  });

  it('monta o HTML com lang pt-BR, o nome no cabeçalho, o conteúdo e o rodapé', () => {
    const { html } = renderEmail(MESSAGE);

    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toMatch(/<html lang="pt-BR">/);
    const header = html.search(/<h1\b[^>]*>Amigo Secreto<\/h1>/);
    const content = html.indexOf('O sorteio do grupo Família já aconteceu.');
    const footer = html.search(new RegExp(`<p\\b[^>]*>${FOOTER}</p>`));
    expect(header).toBeGreaterThan(-1);
    expect(content).toBeGreaterThan(header);
    expect(footer).toBeGreaterThan(content);
  });

  it('começa o texto com Amigo Secreto e termina com o rodapé', () => {
    const { text } = renderEmail(MESSAGE);

    expect(text).toBe(
      [
        'Amigo Secreto',
        'Olá, Ana.',
        'O sorteio do grupo Família já aconteceu.',
        'Ver resultado: https://exemplo.com/r',
        FOOTER,
      ].join('\n\n'),
    );
  });

  it('usa as cores do tema claro nos estilos do HTML', () => {
    const { html } = renderEmail(MESSAGE);
    const style = (element: keyof typeof ELEMENTS) =>
      inlineStyle(openingTag(html, ELEMENTS[element]));

    expect(style('body')).toContain('background-color:#f1f5f9');
    expect(style('card')).toContain('background-color:#ffffff');
    expect(style('card')).toContain('border:1pxsolid#cbd5e1');
    expect(style('card')).toContain('border-radius:12px');
    expect(style('header')).toContain('color:#1e293b');
    expect(style('paragraph')).toContain('color:#1e293b');
    expect(style('footer')).toContain('color:#475569');
    expect(style('button')).toContain('background-color:#0369a1');
    expect(style('button')).toContain('color:#ffffff');
    expect(style('button')).toContain('border-radius:10px');
    expect(style('paragraph')).toContain("font-family:'PlusJakartaSans'");
    expect(html).toMatch(/<meta name="color-scheme" content="light dark">/);
  });

  it('troca para as cores do tema escuro em prefers-color-scheme dark', () => {
    const { html } = renderEmail(MESSAGE);
    const dark = (element: keyof typeof ELEMENTS) =>
      darkDeclarations(html, openingTag(html, ELEMENTS[element]));

    expect(dark('body')).toContain('background-color:#0b1120!important');
    expect(dark('card')).toContain('background-color:#1e293b!important');
    expect(dark('card')).toContain('border-color:#334155!important');
    expect(dark('header')).toContain('color:#e2e8f0!important');
    expect(dark('paragraph')).toContain('color:#e2e8f0!important');
    expect(dark('footer')).toContain('color:#94a3b8!important');
    expect(dark('button')).toContain('background-color:#38bdf8!important');
    expect(dark('button')).toContain('color:#0b1120!important');
  });

  it('mostra como texto os caracteres especiais de HTML do conteúdo', () => {
    const special = `<b>Ana & Bia</b> "aspas" 'apóstrofo'`;

    const email = renderEmail({
      ...MESSAGE,
      blocks: [
        { type: 'paragraph', text: special },
        { type: 'button', label: '<i>Abrir</i>', url: 'https://e.com/?a=1&b="2"' },
      ],
    });

    expect(email.html).toContain(
      '&lt;b&gt;Ana &amp; Bia&lt;/b&gt; &quot;aspas&quot; &#39;apóstrofo&#39;',
    );
    expect(email.html).toContain('&lt;i&gt;Abrir&lt;/i&gt;');
    expect(email.html).toContain('href="https://e.com/?a=1&amp;b=&quot;2&quot;"');
    expect(email.html).not.toContain('<b>');
    expect(email.html).not.toContain('<i>');
    expect(visibleLines(email.html)).toContain(special);
    expect(email.text).toContain(special);
  });

  it('mostra o botão como link no HTML e como rótulo: URL no texto', () => {
    const url = 'https://exemplo.com/grupos/1?aba=sorteio&x=2';

    const email = renderEmail({
      ...MESSAGE,
      blocks: [{ type: 'button', label: 'Ver grupo', url }],
    });

    const link = /<a\b([^>]*)>([^<]*)<\/a>/.exec(email.html);
    expect(link).not.toBeNull();
    expect(decodeEntities(attribute(link?.[1] ?? '', 'href'))).toBe(url);
    expect(link?.[2]).toBe('Ver grupo');
    expect(email.text.split('\n')).toContain(`Ver grupo: ${url}`);
  });
});
