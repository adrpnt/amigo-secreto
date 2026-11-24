import { requireUser } from '@/lib/session';

// Aba Participantes: por ora só as abas do layout.
export default async function ParticipantsPage(
  props: PageProps<'/grupos/[id]/participantes'>,
) {
  const { id } = await props.params;
  await requireUser(`/grupos/${id}/participantes`);
  return null;
}
