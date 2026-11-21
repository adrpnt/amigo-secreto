import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getGoogleSignup } from '@/lib/session';
import { GoogleSignUpForm } from './google-signup-form';

export const metadata: Metadata = {
  title: 'Complete seu cadastro · Amigo Secreto',
};

export default async function CompleteSignUpPage() {
  const googleSignup = await getGoogleSignup();
  if (!googleSignup) {
    redirect('/entrar?erro=google');
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <GoogleSignUpForm
        googleName={googleSignup.name}
        googleEmail={googleSignup.email}
      />
    </main>
  );
}
