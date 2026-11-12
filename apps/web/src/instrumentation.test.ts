// @vitest-environment node
import * as Sentry from '@sentry/nextjs';
import { onRequestError } from './instrumentation';

describe('instrumentation', () => {
  it('exporta onRequestError do Sentry', () => {
    expect(onRequestError).toBe(Sentry.captureRequestError);
  });
});
