import type { Metadata } from 'next';
import { requireUser } from '@/lib/session';
import { GroupForm } from '../group-form';

export const metadata: Metadata = {
  title: 'Novo grupo · Amigo Secreto',
};

export default async function NewGroupPage() {
  await requireUser('/grupos/novo');

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-8">
      <h1 className="text-h1">Novo grupo</h1>
      <GroupForm />
    </main>
  );
}
