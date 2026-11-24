import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

// Código que nunca existiu e código trocado por um link novo caem aqui do
// mesmo jeito.
export default function InviteNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col items-start gap-6 px-4 py-8">
      <h1 className="text-h1">Convite não encontrado</h1>
      <p className="text-body">
        Este link de convite não vale mais. Peça um link novo a quem organiza o
        grupo.
      </p>
      <Link href="/" className={buttonVariants({ variant: 'outline' })}>
        Ir para o início
      </Link>
    </main>
  );
}
