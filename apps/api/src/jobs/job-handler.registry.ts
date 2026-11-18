import { Injectable } from '@nestjs/common';
import type { Job } from './job.entity.js';

export interface JobHandler {
  handle(job: Job): Promise<void>;
}

@Injectable()
export class JobHandlerRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register(type: string, handler: JobHandler): void {
    if (this.handlers.has(type)) {
      throw new Error(`Handler já registrado para o tipo ${type}`);
    }
    this.handlers.set(type, handler);
  }

  get(type: string): JobHandler | undefined {
    return this.handlers.get(type);
  }
}
