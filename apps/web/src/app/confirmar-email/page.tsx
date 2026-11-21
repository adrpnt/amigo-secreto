import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/session';
import { EmailConfirmation, type SessionState } from './email-confirmation';

export const metadata: Metadata = {
  title: 'Confirmar e-mail · Amigo Secreto',
};

export default async function ConfirmEmailPage(
  props: PageProps<'/confirmar-email'>,
) {
  const { token, tipo } = await props.searchParams;
  const user = await getCurrentUser();
  let session: SessionState = 'signed_out';
  if (user) session = user.emailVerified ? 'verified' : 'unverified';

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <EmailConfirmation
        token={typeof token === 'string' && token ? token : undefined}
        kind={tipo === 'troca' ? 'email_change' : 'verification'}
        session={session}
      />
    </main>
  );
}
