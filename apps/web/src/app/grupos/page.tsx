import type { MyGroupsResponse } from '@amigo-secreto/shared';
import type { Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';
import { getMyGroups } from '@/lib/groups';
import { requireUser } from '@/lib/session';
import { MyGroupsView } from './my-groups-view';

export const metadata: Metadata = {
  title: 'Meus grupos · Amigo Secreto',
};

export default async function MyGroupsPage() {
  await requireUser('/grupos');

  let groups: MyGroupsResponse | null;
  try {
    groups = await getMyGroups();
  } catch (error) {
    // Os sinais do Next seguem para o framework; só falha da API vira o erro
    // da tela.
    unstable_rethrow(error);
    groups = null;
  }

  return <MyGroupsView groups={groups} />;
}
