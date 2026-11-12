// @vitest-environment node
import { sentryOptions } from './sentry-options';

const DSN = 'https://public@sentry.example.com/1';

const { init } = vi.hoisted(() => ({ init: vi.fn() }));

vi.mock('@sentry/nextjs', () => ({ init }));

async function loadSentryEntries() {
  vi.resetModules();
  await import('../instrumentation-client');
  await import('../sentry.server.config');
}

afterEach(() => {
  init.mockReset();
  vi.unstubAllEnvs();
});

describe('sentryOptions', () => {
  it('liga o Sentry no navegador e no servidor quando NEXT_PUBLIC_SENTRY_DSN existe', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', DSN);

    await loadSentryEntries();

    expect(init).toHaveBeenCalledTimes(2);
    const [[browserOptions], [serverOptions]] = init.mock.calls as [
      [{ dsn: string }],
      [{ dsn: string }],
    ];
    expect(browserOptions.dsn).toBe(DSN);
    expect(serverOptions.dsn).toBe(DSN);
  });

  it('desliga o Sentry sem NEXT_PUBLIC_SENTRY_DSN', async () => {
    expect(sentryOptions({})).toBeUndefined();
    expect(sentryOptions({ NEXT_PUBLIC_SENTRY_DSN: '' })).toBeUndefined();

    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', undefined);

    await loadSentryEntries();

    expect(init).not.toHaveBeenCalled();
  });

  it('desliga a coleta de dados pessoais, sem replay e sem tracing', () => {
    const options = sentryOptions({ NEXT_PUBLIC_SENTRY_DSN: DSN });

    expect(options?.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      databaseQueryData: false,
    });
    expect(options).not.toHaveProperty('tracesSampleRate');
    expect(options).not.toHaveProperty('tracesSampler');
    expect(options).not.toHaveProperty('replaysSessionSampleRate');
    expect(options).not.toHaveProperty('replaysOnErrorSampleRate');
    expect(options).not.toHaveProperty('integrations');

    const event = options?.beforeSend({
      type: undefined,
      request: {
        url: 'http://localhost:3000/api/groups',
        method: 'POST',
        data: { password: 'segredo' },
        cookies: { session: 'abc' },
      },
    });

    expect(event?.request).toEqual({
      url: 'http://localhost:3000/api/groups',
      method: 'POST',
    });
  });
});
