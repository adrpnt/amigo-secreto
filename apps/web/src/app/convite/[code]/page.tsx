import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { getInvite } from '@/lib/invites';
import { inviteMetadata } from './invite-metadata';
import { InviteView } from './invite-view';

// Metadados e página leem o convite com uma ida à API por requisição: cada
// ida conta no limite por IP e no evento invite.viewed.
const getInviteOnce = cache(getInvite);

export async function generateMetadata(
  props: PageProps<'/convite/[code]'>,
): Promise<Metadata> {
  const { code } = await props.params;
  return inviteMetadata(await getInviteOnce(code));
}

export default async function InvitePage(props: PageProps<'/convite/[code]'>) {
  const { code } = await props.params;
  const invite = await getInviteOnce(code);
  if (!invite) notFound();
  if (!('tooMany' in invite) && invite.viewer === 'member' && invite.groupId) {
    redirect(`/grupos/${invite.groupId}`);
  }

  return <InviteView code={code} invite={invite} />;
}
