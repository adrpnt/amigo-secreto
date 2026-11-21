import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { GoogleButton } from '@/components/google-button';
import { isInAppBrowser } from '@/lib/in-app-browser';
import { safeNext } from '@/lib/safe-next';
import { getSession } from '@/lib/session';
import { SignUpForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Criar conta · Amigo Secreto',
};

export default async function SignUpPage(props: PageProps<'/cadastro'>) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === 'string' ? next : undefined;

  const { user, googleEnabled } = await getSession();
  if (user) {
    redirect(safeNext(nextPath));
  }
  const userAgent = (await headers()).get('user-agent') ?? '';

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <SignUpForm
        next={nextPath}
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
