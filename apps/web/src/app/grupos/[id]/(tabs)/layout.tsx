import type { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import { GroupTabs } from '@/components/group-tabs';
import { getCurrentUser } from '@/lib/session';
import { getCurrentGroup } from './current-group';
import { GroupHeader } from './group-header';

export async function generateMetadata(
  props: LayoutProps<'/grupos/[id]'>,
): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const group = await getCurrentGroup(id);
    if (group) return { title: `${group.name} · Amigo Secreto` };
  } catch (error) {
    // Sem sessão a página leva a /entrar; a aba não decide nada.
    unstable_rethrow(error);
  }
  return { title: 'Grupo não encontrado · Amigo Secreto' };
}

// Cabeçalho e abas comuns a Grupo e Participantes. Sem sessão, cada aba leva a
// /entrar com o próprio caminho como origem.
export default async function GroupTabsLayout(
  props: LayoutProps<'/grupos/[id]'>,
) {
  const { id } = await props.params;
  if (!(await getCurrentUser())) return props.children;

  const group = await getCurrentGroup(id);
  if (!group) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-6">
        <GroupHeader group={group} />
        <GroupTabs groupId={group.id} />
      </div>
      {props.children}
    </main>
  );
}
