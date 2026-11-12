import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import type { NodeEnvironment } from '../config/env.validation.js';
import { RequestContext } from './request-context.js';

type JsonLogOptions = Parameters<ConsoleLogger['getJsonLogObject']>[1];

export class AppLogger extends ConsoleLogger {
  constructor(nodeEnv: NodeEnvironment) {
    super({ json: nodeEnv === 'production', flattenParams: true });
  }

  protected override getJsonLogObject(
    message: unknown,
    options: JsonLogOptions,
  ): ReturnType<ConsoleLogger['getJsonLogObject']> {
    const logObject = super.getJsonLogObject(message, options);
    const requestId = RequestContext.getRequestId();
    return requestId ? { ...logObject, requestId } : logObject;
  }

  protected override formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
    params?: Record<string, unknown>,
  ): string {
    const line = super.formatMessage(
      logLevel,
      message,
      pidMessage,
      formattedLogLevel,
      contextMessage,
      timestampDiff,
      params,
    );
    const requestId = RequestContext.getRequestId();
    return requestId
      ? line.replace(/\n$/, ` [requestId=${requestId}]\n`)
      : line;
  }
}
