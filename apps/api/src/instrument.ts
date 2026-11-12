import * as Sentry from '@sentry/nestjs';

type SentryEnvironment = { SENTRY_DSN?: string };

export function initSentry(
  env: SentryEnvironment,
): ReturnType<typeof Sentry.init> {
  if (!env.SENTRY_DSN) {
    return undefined;
  }

  return Sentry.init({
    dsn: env.SENTRY_DSN,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      databaseQueryData: false,
    },
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  });
}

initSentry(process.env);
