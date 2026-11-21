import type { SessionResponse, SessionUser } from '@amigo-secreto/shared';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_TIMEOUT_MS = 5_000;

// Lê a sessão da requisição atual na API. Falha da API lança erro: tratar
// como "sem sessão" mandaria quem está logado para /entrar.
export async function getSession(): Promise<SessionResponse> {
  // Ler os cookies primeiro deixa a página dinâmica: no build não há
  // API_INTERNAL_URL.
  const cookieHeader = (await cookies()).toString();
  const apiUrl = process.env.API_INTERNAL_URL;
  if (!apiUrl) {
    throw new Error('API_INTERNAL_URL não está definida.');
  }

  const response = await fetch(`${apiUrl}/auth/session`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  });
  if (response.status !== 200) {
    throw new Error(`A API respondeu ${response.status} em /auth/session.`);
  }
  return (await response.json()) as SessionResponse;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const { user } = await getSession();
  return user;
}

export async function requireUser(path: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(path)}`);
  }
  return user;
}

export type GoogleSignup = { name: string; email: string };

// Nome e e-mail do Google guardados no cookie g_signup, entre o retorno do
// Google e o envio de "Complete seu cadastro". Sem cookie válido, null.
export async function getGoogleSignup(): Promise<GoogleSignup | null> {
  // Ler os cookies primeiro deixa a página dinâmica: no build não há
  // API_INTERNAL_URL.
  const cookieHeader = (await cookies()).toString();
  const apiUrl = process.env.API_INTERNAL_URL;
  if (!apiUrl) {
    throw new Error('API_INTERNAL_URL não está definida.');
  }

  const response = await fetch(`${apiUrl}/auth/google/signup`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  });
  if (response.status === 401) return null;
  if (response.status !== 200) {
    throw new Error(
      `A API respondeu ${response.status} em /auth/google/signup.`,
    );
  }
  return (await response.json()) as GoogleSignup;
}
