export type HealthStatus = 'ok' | 'error';

export type HealthIndicatorStatus = 'up' | 'down';

export type HealthResponse = {
  status: HealthStatus;
  details: Record<string, { status: HealthIndicatorStatus }>;
};

// Versão vigente dos Termos de uso e da Política de privacidade, gravada no
// aceite do cadastro e mostrada nas páginas dos documentos.
export const TERMS_VERSION = '2026-11-19';

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

export * from './groups.js';
