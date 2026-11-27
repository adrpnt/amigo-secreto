'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Abas do grupo. São rotas, então links com `aria-current`, não `tablist`.
export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const tabs = [
    { label: 'Grupo', href: `/grupos/${groupId}` },
    { label: 'Participantes', href: `/grupos/${groupId}/participantes` },
    { label: 'Sorteio', href: `/grupos/${groupId}/sorteio` },
  ];

  return (
    <nav
      aria-label="Seções do grupo"
      className="flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1"
    >
      {tabs.map((tab) => {
        const isCurrent = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isCurrent ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-touch-target flex-[1_0_auto] items-center justify-center rounded-sm px-3 text-sm leading-5 font-semibold whitespace-nowrap text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              isCurrent && 'bg-card text-foreground shadow-sm',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
