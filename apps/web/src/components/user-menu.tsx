import type { SessionUser } from '@amigo-secreto/shared';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { connection } from 'next/server';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/session';
import { UserMenuDropdown } from './user-menu-dropdown';

// Canto do cabeçalho: "Entrar" sem sessão, o avatar com o menu da conta com
// sessão. Sem sessão legível (API fora do ar), nenhum dos dois aparece.
export async function UserMenu() {
  // O cabeçalho depende da sessão da requisição.
  await connection();
  let user: SessionUser | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // Os sinais do Next seguem para o framework; só falha da API esconde.
    unstable_rethrow(error);
    return null;
  }

  if (!user) {
    return (
      <Link href="/entrar" className={buttonVariants({ size: 'sm' })}>
        Entrar
      </Link>
    );
  }
  return (
    <UserMenuDropdown
      name={user.name}
      email={user.email}
      avatarUrl={user.avatarUrl}
    />
  );
}
