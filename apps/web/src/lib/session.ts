import type { SessionResponse, SessionUser } from '@amigo-secreto/shared';
import { redirect } from 'next/navigation';
import { apiServerFetch } from './api-server';

// Lê a sessão da requisição atual na API. Falha da API lança erro: tratar
// como "sem sessão" mandaria quem está logado para /entrar.
export async function getSession(): Promise<SessionResponse> {
  const response = await apiServerFetch('/auth/session');
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
  const response = await apiServerFetch('/auth/google/signup');
  if (response.status === 401) return null;
  if (response.status !== 200) {
    throw new Error(
      `A API respondeu ${response.status} em /auth/google/signup.`,
    );
  }
  return (await response.json()) as GoogleSignup;
}
