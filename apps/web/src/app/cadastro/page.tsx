import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/safe-next';
import { getCurrentUser } from '@/lib/session';
import { SignUpForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Criar conta · Amigo Secreto',
};

export default async function SignUpPage(props: PageProps<'/cadastro'>) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === 'string' ? next : undefined;

  if (await getCurrentUser()) {
    redirect(safeNext(nextPath));
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <SignUpForm next={nextPath} />
    </main>
  );
}
