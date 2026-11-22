import type { Metadata } from 'next';
import { notFound, redirect, unstable_rethrow } from 'next/navigation';
import { cache } from 'react';
import { getGroup } from '@/lib/groups';
import { requireUser } from '@/lib/session';
import { GroupForm } from '../../group-form';
import { editRedirect } from './edit-redirect';

// A aba e a página leem o mesmo grupo com uma ida à API por requisição.
const getGroupOnce = cache(getGroup);

export async function generateMetadata(
  props: PageProps<'/grupos/[id]/editar'>,
): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const group = await getGroupOnce(id);
    if (group) return { title: `Editar ${group.name} · Amigo Secreto` };
  } catch (error) {
    // Sem sessão a página leva a /entrar; a aba não decide nada.
    unstable_rethrow(error);
  }
  return { title: 'Grupo não encontrado · Amigo Secreto' };
}

export default async function EditGroupPage(
  props: PageProps<'/grupos/[id]/editar'>,
) {
  const { id } = await props.params;
  await requireUser(`/grupos/${id}/editar`);

  const group = await getGroupOnce(id);
  if (!group) notFound();
  const target = editRedirect(group);
  if (target) redirect(target);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-8">
      <h1 className="text-h1">Editar grupo</h1>
      <GroupForm group={group} />
    </main>
  );
}
