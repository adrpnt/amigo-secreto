'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api-fetch';
import { UserAvatar, initialsOf } from './user-avatar';

export function UserMenuDropdown({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();

  async function signOut() {
    try {
      const response = await apiFetch('/auth/logout', { method: 'POST' });
      if (response.status !== 204) return;
    } catch {
      return;
    }
    router.replace('/entrar');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // O nome repete as iniciais que aparecem no botão (WCAG 2.5.3).
        aria-label={`${initialsOf(name)}, menu da conta`}
        className="inline-flex size-touch-target items-center justify-center rounded-full transition-colors duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <UserAvatar name={name} avatarUrl={avatarUrl} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-popover-foreground">
              {name}
            </span>
            <span className="font-normal">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/grupos" />}>
          Meus grupos
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/perfil" />}>
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOut()}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
