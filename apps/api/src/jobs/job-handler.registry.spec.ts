import { type JobHandler, JobHandlerRegistry } from './job-handler.registry.js';

const handlerA: JobHandler = { handle: () => Promise.resolve() };
const handlerB: JobHandler = { handle: () => Promise.resolve() };

describe('JobHandlerRegistry', () => {
  it('devolve o handler registrado para o tipo', () => {
    const registry = new JobHandlerRegistry();

    registry.register('email.send', handlerA);
    registry.register('draw.remind', handlerB);

    expect(registry.get('email.send')).toBe(handlerA);
    expect(registry.get('draw.remind')).toBe(handlerB);
  });

  it('devolve undefined para tipo sem handler', () => {
    const registry = new JobHandlerRegistry();
    registry.register('email.send', handlerA);

    expect(registry.get('draw.remind')).toBeUndefined();
  });

  it('lança erro ao registrar o mesmo tipo duas vezes', () => {
    const registry = new JobHandlerRegistry();
    registry.register('email.send', handlerA);

    expect(() => registry.register('email.send', handlerB)).toThrow(
      new Error('Handler já registrado para o tipo email.send'),
    );
    expect(registry.get('email.send')).toBe(handlerA);
  });
});
