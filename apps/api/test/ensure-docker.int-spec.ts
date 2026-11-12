import { ensureDocker } from './docker.js';

describe('ensureDocker', () => {
  it('falha com a mensagem sobre o Docker quando ele não está disponível', async () => {
    const unavailableRuntime = () =>
      Promise.reject(new Error('connect ENOENT /var/run/docker.sock'));

    await expect(ensureDocker(unavailableRuntime)).rejects.toThrow(
      'Os testes de integração precisam do Docker em execução.',
    );
  });
});
