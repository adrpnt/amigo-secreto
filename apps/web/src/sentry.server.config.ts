import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentry-options';

const options = sentryOptions({
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});

if (options) {
  Sentry.init(options);
}
