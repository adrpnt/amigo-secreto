import { Injectable, Logger } from '@nestjs/common';

export type BusinessEventName = `${string}.${string}`;

export type BusinessEventAttributes = Record<string, string | number | boolean>;

@Injectable()
export class BusinessEventsService {
  private readonly logger = new Logger('BusinessEvents');

  record(
    event: BusinessEventName,
    attributes: BusinessEventAttributes = {},
  ): void {
    this.logger.log(event, { ...attributes, event });
  }
}
