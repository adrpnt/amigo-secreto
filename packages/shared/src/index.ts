export type HealthStatus = 'ok' | 'error';

export type HealthIndicatorStatus = 'up' | 'down';

export type HealthResponse = {
  status: HealthStatus;
  details: Record<string, { status: HealthIndicatorStatus }>;
};

// Usuário da sessão como a API o entrega ao site; nenhum hash sai da API.
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  hasGoogle: boolean;
  marketingOptIn: boolean;
};

export type SessionResponse = {
  user: SessionUser | null;
  googleEnabled: boolean;
};
