import { whatsappShareUrl } from './whatsapp';

describe('whatsappShareUrl', () => {
  it('codifica o nome e o link no texto', () => {
    const url = whatsappShareUrl(
      'Família & Amigos #1',
      'https://amigo.example.com/convite/abc23def45',
    );

    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    const query = url.slice('https://wa.me/?text='.length);
    expect(query).not.toMatch(/[ &#]/);
    expect(new URL(url).searchParams.get('text')).toBe(
      'Vamos fazer amigo secreto! Entre no grupo Família & Amigos #1: https://amigo.example.com/convite/abc23def45',
    );
  });
});
