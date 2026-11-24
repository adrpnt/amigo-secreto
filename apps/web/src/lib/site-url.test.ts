// @vitest-environment node
import { connection } from 'next/server';
import { siteMetadata, siteUrl } from './site-url';

vi.mock('next/server', () => ({ connection: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(connection).mockReset();
});

describe('siteUrl', () => {
  it('lê WEB_URL da requisição', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('WEB_URL', 'https://amigo.example.com');
    expect(siteUrl()).toBe('https://amigo.example.com');

    vi.stubEnv('WEB_URL', 'https://outro.example.com');
    expect(siteUrl()).toBe('https://outro.example.com');
  });

  it('usa http://localhost:3000 fora de produção sem WEB_URL', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('WEB_URL', undefined);

    expect(siteUrl()).toBe('http://localhost:3000');
  });

  it('lança em produção sem WEB_URL', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('WEB_URL', undefined);

    expect(() => siteUrl()).toThrow('WEB_URL não está definida.');
  });
});

describe('siteMetadata', () => {
  it('põe o WEB_URL no metadataBase', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('WEB_URL', 'https://amigo.example.com');

    const metadata = await siteMetadata();

    expect(connection).toHaveBeenCalledTimes(1);
    expect(metadata.metadataBase).toEqual(new URL('https://amigo.example.com'));
  });
});
