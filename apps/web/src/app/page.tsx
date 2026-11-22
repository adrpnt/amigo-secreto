import type { SessionUser } from '@amigo-secreto/shared';
import { redirect, unstable_rethrow } from 'next/navigation';
import { connection } from 'next/server';
import { getApiStatus } from '@/lib/api-status';
import { getCurrentUser } from '@/lib/session';

const STATUS_TEXT = {
  online: 'API online',
  unavailable: 'API indisponível',
} as const;

export default async function HomePage() {
  await connection();

  let user: SessionUser | null = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // Os sinais do Next seguem para o framework; com a API fora a página
    // continua aparecendo, como para quem não entrou.
    unstable_rethrow(error);
  }
  if (user) redirect('/grupos');

  const status = await getApiStatus();

  return (
    <main className="px-4 py-8 md:px-6">
      <h1 className="text-display">Amigo Secreto</h1>
      <p className="text-body text-muted-foreground">{STATUS_TEXT[status]}</p>
    </main>
  );
}
