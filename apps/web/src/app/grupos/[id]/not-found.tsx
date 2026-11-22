import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

// Grupo inexistente, id inválido e grupo de que a pessoa não participa caem
// aqui do mesmo jeito.
export default function GroupNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 px-4 py-8">
      <h1 className="text-h1">Grupo não encontrado.</h1>
      <Link href="/grupos" className={buttonVariants({ variant: 'outline' })}>
        Meus grupos
      </Link>
    </main>
  );
}
