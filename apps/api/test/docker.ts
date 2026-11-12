import { getContainerRuntimeClient } from 'testcontainers';

export const DOCKER_REQUIRED_MESSAGE =
  'Os testes de integração precisam do Docker em execução.';

export async function ensureDocker(
  checkRuntime: () => Promise<unknown> = getContainerRuntimeClient,
): Promise<void> {
  try {
    await checkRuntime();
  } catch {
    throw new Error(DOCKER_REQUIRED_MESSAGE);
  }
}
