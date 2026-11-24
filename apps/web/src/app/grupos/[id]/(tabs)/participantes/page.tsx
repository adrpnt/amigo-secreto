import type { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import { EmailInviteForm } from '@/components/email-invite-form';
import { InviteBlock } from '@/components/invite-block';
import { MemberActions } from '@/components/member-actions';
import { getMembers } from '@/lib/members';
import { requireUser } from '@/lib/session';
import { siteUrl } from '@/lib/site-url';
import { getCurrentGroup } from '../current-group';

export async function generateMetadata(
  props: PageProps<'/grupos/[id]/participantes'>,
): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const group = await getCurrentGroup(id);
    if (group) {
      return { title: `Participantes · ${group.name} · Amigo Secreto` };
    }
  } catch (error) {
    // Sem sessão a página leva a /entrar; a aba não decide nada.
    unstable_rethrow(error);
  }
  return { title: 'Grupo não encontrado · Amigo Secreto' };
}

// Aba Participantes: o convite no topo e a lista, com as ações de quem
// organiza.
export default async function ParticipantsPage(
  props: PageProps<'/grupos/[id]/participantes'>,
) {
  const { id } = await props.params;
  await requireUser(`/grupos/${id}/participantes`);

  const group = await getCurrentGroup(id);
  if (!group) notFound();
  const members = await getMembers(group.id);
  if (!members) notFound();

  return (
    <>
      <InviteBlock
        group={group}
        siteUrl={siteUrl()}
        emailInvite={
          group.isOrganizer ? <EmailInviteForm groupId={group.id} /> : undefined
        }
      />
      {/* Depois de transferir a organização, a lista recomeça com a
          primeira página nova: tags e ações mudam de pessoa. */}
      <MemberActions
        key={group.owner.id}
        groupId={group.id}
        initialPage={members}
        canManage={group.isOrganizer}
        groupStatus={group.status}
      />
    </>
  );
}
