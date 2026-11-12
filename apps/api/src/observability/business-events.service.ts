import { Injectable, Logger } from '@nestjs/common';

export type BusinessEventName = `${string}.${string}`;

// Campos que o logger e o serviço já ocupam na linha de log; um atributo com esses nomes sumiria.
type ReservedAttributeName =
  'level' | 'pid' | 'timestamp' | 'message' | 'context' | 'requestId' | 'event';

export type BusinessEventAttributes = Record<
  string,
  string | number | boolean
> & { [name in ReservedAttributeName]?: never };

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
