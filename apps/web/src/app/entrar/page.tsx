import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { GoogleButton } from '@/components/google-button';
import { isInAppBrowser } from '@/lib/in-app-browser';
import { safeNext } from '@/lib/safe-next';
import { getSession } from '@/lib/session';
import { SignInForm } from './signin-form';

export const metadata: Metadata = {
  title: 'Entrar · Amigo Secreto',
};

// Erros com que a API devolve o retorno do Google a /entrar.
const GOOGLE_ERRORS: Record<string, string> = {
  google: 'Não foi possível entrar com Google. Tente de novo.',
  google_nao_verificado:
    'Não foi possível entrar com Google. Entre com e-mail e senha.',
};

export default async function SignInPage(props: PageProps<'/entrar'>) {
  const { next, erro } = await props.searchParams;
  const nextPath = typeof next === 'string' ? next : undefined;
  const googleError =
    typeof erro === 'string' ? GOOGLE_ERRORS[erro] : undefined;

  const { user, googleEnabled } = await getSession();
  if (user) {
    redirect(safeNext(nextPath));
  }
  const userAgent = (await headers()).get('user-agent') ?? '';

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <SignInForm
        next={nextPath}
        initialError={googleError}
        google={
          googleEnabled && (
            <>
              <GoogleButton
                googleEnabled
                inAppBrowser={isInAppBrowser(userAgent)}
                next={nextPath}
              />
              <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
                <span aria-hidden className="h-px flex-1 bg-border" />
                ou
                <span aria-hidden className="h-px flex-1 bg-border" />
              </div>
            </>
          )
        }
      />
    </main>
  );
}
