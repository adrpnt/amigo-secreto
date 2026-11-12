import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NestMiddleware } from '@nestjs/common';
import { RequestContext } from './request-context.js';

export const REQUEST_ID_HEADER = 'x-request-id';

export class RequestIdMiddleware implements NestMiddleware {
  use(request: IncomingMessage, response: ServerResponse, next: () => void) {
    const received = request.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof received === 'string' && received ? received : randomUUID();
    response.setHeader(REQUEST_ID_HEADER, requestId);
    RequestContext.run(requestId, next);
  }
}
