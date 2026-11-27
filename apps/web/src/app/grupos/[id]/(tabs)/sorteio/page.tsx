import type { Metadata } from 'next';
import { Hourglass } from 'lucide-react';
import { notFound, unstable_rethrow } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { drawTabView } from '@/lib/draw-format';
import { requireUser } from '@/lib/session';
import { getCurrentGroup } from '../current-group';

export async function generateMetadata(
  props: PageProps<'/grupos/[id]/sorteio'>,
): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const group = await getCurrentGroup(id);
    if (group) return { title: `Sorteio · ${group.name} · Amigo Secreto` };
  } catch (error) {
    // Sem sessão a página leva a /entrar; a aba não decide nada.
    unstable_rethrow(error);
  }
  return { title: 'Grupo não encontrado · Amigo Secreto' };
}

// Aba Sorteio: a visão depende de quem organiza e do status do grupo.
export default async function DrawPage(
  props: PageProps<'/grupos/[id]/sorteio'>,
) {
  const { id } = await props.params;
  await requireUser(`/grupos/${id}/sorteio`);

  const group = await getCurrentGroup(id);
  if (!group) notFound();

  if (drawTabView(group.isOrganizer, group.status) === 'participant_waiting') {
    return (
      <Alert variant="info">
        <Hourglass aria-hidden />
        <AlertDescription>
          O sorteio ainda não foi feito. Você recebe um e-mail quando{' '}
          {group.owner.name} sortear.
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}
