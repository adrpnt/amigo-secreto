import type { ErrorEvent } from '@sentry/nextjs';

type SentryEnvironment = { NEXT_PUBLIC_SENTRY_DSN?: string };

export function sentryOptions(env: SentryEnvironment) {
  if (!env.NEXT_PUBLIC_SENTRY_DSN) {
    return undefined;
  }

  return {
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      databaseQueryData: false,
    },
    beforeSend(event: ErrorEvent) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  };
}
