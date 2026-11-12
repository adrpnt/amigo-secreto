import { Global, Module } from '@nestjs/common';
import { BusinessEventsService } from './business-events.service.js';

@Global()
@Module({
  providers: [BusinessEventsService],
  exports: [BusinessEventsService],
})
export class ObservabilityModule {}
