import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { GroupDetailView } from '../group-detail-view';
import { LeaveGroup } from '../leave-group';
import { getCurrentGroup } from './current-group';

export default async function GroupPage(props: PageProps<'/grupos/[id]'>) {
  const { id } = await props.params;
  await requireUser(`/grupos/${id}`);

  const group = await getCurrentGroup(id);
  if (!group) notFound();

  return (
    <>
      <GroupDetailView group={group} />
      <LeaveGroup group={group} />
    </>
  );
}
