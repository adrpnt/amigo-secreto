import type { Metadata } from 'next';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = {
  title: 'Esqueci a senha · Amigo Secreto',
};

export default async function ForgotPasswordPage(
  props: PageProps<'/esqueci-a-senha'>,
) {
  const { next } = await props.searchParams;

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <ForgotPasswordForm next={typeof next === 'string' ? next : undefined} />
    </main>
  );
}
