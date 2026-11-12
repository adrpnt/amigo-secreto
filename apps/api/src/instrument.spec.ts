import * as Sentry from '@sentry/nestjs';
import { initSentry } from './instrument.js';

const DSN = 'https://public@sentry.example.com/1';

describe('initSentry', () => {
  beforeEach(() => {
    Sentry.getCurrentScope().setClient(undefined);
  });

  afterAll(async () => {
    await Sentry.close();
  });

  it('não inicializa o Sentry sem SENTRY_DSN', () => {
    expect(initSentry({})).toBeUndefined();
    expect(initSentry({ SENTRY_DSN: '' })).toBeUndefined();
    expect(Sentry.isInitialized()).toBe(false);
  });

  it('inicializa o Sentry quando SENTRY_DSN existe', () => {
    const client = initSentry({ SENTRY_DSN: DSN });

    expect(Sentry.isInitialized()).toBe(true);
    expect(Sentry.getClient()).toBe(client);
    expect(client?.getOptions().dsn).toBe(DSN);
  });

  it('desliga a coleta de dados pessoais, sem tracing e remove corpo e cookies do evento', async () => {
    const options = initSentry({ SENTRY_DSN: DSN })?.getOptions();

    expect(options?.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      databaseQueryData: false,
    });
    expect(options?.tracesSampleRate).toBeUndefined();
    expect(options?.tracesSampler).toBeUndefined();

    const event = await options?.beforeSend?.(
      {
        type: undefined,
        request: {
          url: 'http://localhost:3001/groups',
          method: 'POST',
          data: { password: 'segredo' },
          cookies: { session: 'abc' },
        },
      },
      {},
    );

    expect(event?.request).toEqual({
      url: 'http://localhost:3001/groups',
      method: 'POST',
    });
  });
});
