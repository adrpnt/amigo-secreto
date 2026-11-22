import type { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import { cache } from 'react';
import { getGroup } from '@/lib/groups';
import { requireUser } from '@/lib/session';
import { GroupDetailView } from './group-detail-view';

// A aba e a página leem o mesmo grupo com uma ida à API por requisição.
const getGroupOnce = cache(getGroup);

export async function generateMetadata(
  props: PageProps<'/grupos/[id]'>,
): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const group = await getGroupOnce(id);
    if (group) return { title: `${group.name} · Amigo Secreto` };
  } catch (error) {
    // Sem sessão a página leva a /entrar; a aba não decide nada.
    unstable_rethrow(error);
  }
  return { title: 'Grupo não encontrado · Amigo Secreto' };
}

export default async function GroupPage(props: PageProps<'/grupos/[id]'>) {
  const { id } = await props.params;
  await requireUser(`/grupos/${id}`);

  const group = await getGroupOnce(id);
  if (!group) notFound();

  return <GroupDetailView group={group} />;
}
