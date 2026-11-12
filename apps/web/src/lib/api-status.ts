import type { HealthResponse } from '@amigo-secreto/shared';

export type ApiStatus = 'online' | 'unavailable';

const HEALTH_TIMEOUT_MS = 5_000;

export async function getApiStatus(): Promise<ApiStatus> {
  const apiUrl = process.env.API_INTERNAL_URL;
  if (!apiUrl) {
    throw new Error('API_INTERNAL_URL não está definida.');
  }

  try {
    const response = await fetch(`${apiUrl}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (response.status !== 200) return 'unavailable';

    const body = (await response.json()) as HealthResponse;
    return body.status === 'ok' ? 'online' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}
