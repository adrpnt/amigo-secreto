import { AppLogger } from './app-logger.js';
import { RequestContext } from './request-context.js';

function captureStdout(): string[] {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  return chunks;
}

describe('AppLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escreve uma linha JSON com level, timestamp e message em produção', () => {
    const output = captureStdout();
    const before = Date.now();

    new AppLogger('production').log('Grupo criado', 'GroupsService');

    expect(output).toHaveLength(1);
    const line = output[0] ?? '';
    expect(line.trimEnd()).not.toContain('\n');
    const record = JSON.parse(line) as Record<string, unknown>;
    expect(record).toMatchObject({
      level: 'log',
      message: 'Grupo criado',
      context: 'GroupsService',
    });
    expect(record.timestamp).toBeGreaterThanOrEqual(before);
    expect(record.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('inclui o requestId do contexto na linha', () => {
    const output = captureStdout();

    RequestContext.run('req-123', () => {
      new AppLogger('production').log('Convite aceito');
      new AppLogger('development').log('Convite aceito');
    });
    new AppLogger('production').log('Fora da requisição');

    expect(output).toHaveLength(3);
    expect(JSON.parse(output[0] ?? '')).toMatchObject({
      message: 'Convite aceito',
      requestId: 'req-123',
    });
    expect(output[1]).toContain('Convite aceito');
    expect(output[1]).toContain('requestId=req-123');
    expect(JSON.parse(output[2] ?? '')).not.toHaveProperty('requestId');
  });

  it('escreve texto legível fora de produção', () => {
    const output = captureStdout();

    new AppLogger('development').log('Servidor iniciado', 'Bootstrap');

    expect(output).toHaveLength(1);
    const line = output[0] ?? '';
    expect(line).toContain('Servidor iniciado');
    expect(line).toContain('LOG');
    expect(line).toContain('[Bootstrap]');
    expect(() => JSON.parse(line) as unknown).toThrow();
  });
});
