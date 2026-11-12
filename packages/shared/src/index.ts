export type HealthStatus = 'ok' | 'error';

export type HealthIndicatorStatus = 'up' | 'down';

export type HealthResponse = {
  status: HealthStatus;
  details: Record<string, { status: HealthIndicatorStatus }>;
};
