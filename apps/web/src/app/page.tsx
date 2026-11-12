import { connection } from 'next/server';
import { getApiStatus } from '@/lib/api-status';

const STATUS_TEXT = {
  online: 'API online',
  unavailable: 'API indisponível',
} as const;

export default async function HomePage() {
  await connection();
  const status = await getApiStatus();

  return (
    <main className="px-4 py-8 md:px-6">
      <h1 className="text-display">Amigo Secreto</h1>
      <p className="text-body text-muted-foreground">{STATUS_TEXT[status]}</p>
    </main>
  );
}
