import { ConsoleLogger, Logger } from '@nestjs/common';
import { AppLogger } from './app-logger.js';
import { BusinessEventsService } from './business-events.service.js';
import { RequestContext } from './request-context.js';

describe('BusinessEventsService', () => {
  const output: string[] = [];

  function loggedRecords(): Record<string, unknown>[] {
    return output.map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  beforeEach(() => {
    output.length = 0;
    Logger.overrideLogger(new AppLogger('production'));
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Logger.overrideLogger(new ConsoleLogger());
  });

  it('registra event, timestamp e os atributos no log', () => {
    const before = Date.now();

    new BusinessEventsService().record('group.created', {
      groupId: 'g-1',
      participants: 5,
      isArchived: false,
    });

    const records = loggedRecords();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      event: 'group.created',
      groupId: 'g-1',
      participants: 5,
      isArchived: false,
    });
    expect(records[0]?.timestamp).toBeGreaterThanOrEqual(before);
    expect(records[0]?.timestamp).toBeLessThanOrEqual(Date.now());
    expect(records[0]).not.toHaveProperty('requestId');
  });

  it('inclui o requestId quando há requisição', () => {
    RequestContext.run('req-9c1', () => {
      new BusinessEventsService().record('draw.performed', { groupId: 'g-2' });
    });

    expect(loggedRecords()).toEqual([
      expect.objectContaining({
        event: 'draw.performed',
        groupId: 'g-2',
        requestId: 'req-9c1',
      }),
    ]);
  });
});
