import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContextStore = { requestId: string };

export class RequestContext {
  private static readonly storage =
    new AsyncLocalStorage<RequestContextStore>();

  static run<T>(requestId: string, callback: () => T): T {
    return RequestContext.storage.run({ requestId }, callback);
  }

  static getRequestId(): string | undefined {
    return RequestContext.storage.getStore()?.requestId;
  }
}
