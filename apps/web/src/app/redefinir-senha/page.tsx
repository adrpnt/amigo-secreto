import type { Metadata } from 'next';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = {
  title: 'Redefinir senha · Amigo Secreto',
};

export default async function ResetPasswordPage(
  props: PageProps<'/redefinir-senha'>,
) {
  const { token } = await props.searchParams;

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <ResetPasswordForm
        token={typeof token === 'string' && token ? token : undefined}
      />
    </main>
  );
}
