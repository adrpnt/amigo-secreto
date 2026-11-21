import type { ReactNode } from 'react';
import type { GroupStatus } from '@amigo-secreto/shared';
import { Archive, Gift, LockOpen, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const GROUP_STATUS: Record<
  GroupStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  OPEN: {
    label: 'ABERTO',
    icon: LockOpen,
    className: 'bg-info-subtle text-info-subtle-foreground',
  },
  DRAWN: {
    label: 'SORTEADO',
    icon: Gift,
    className: 'bg-festive-subtle text-festive-subtle-foreground',
  },
  CLOSED: {
    label: 'ENCERRADO',
    icon: Archive,
    className: 'bg-muted text-muted-foreground',
  },
};

const BASE_CLASS =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs leading-4 font-medium whitespace-nowrap';

type StatusTagProps =
  | { status: GroupStatus; children?: never }
  | { status?: never; children: ReactNode };

// Status do grupo em maiúsculas, sempre com ícone e palavra. Sem status, a tag
// é neutra e mostra o texto recebido ("Você organiza").
export function StatusTag(props: StatusTagProps) {
  if (!props.status) {
    return (
      <span
        className={cn(BASE_CLASS, 'bg-secondary text-secondary-foreground')}
      >
        {props.children}
      </span>
    );
  }

  const { label, icon: Icon, className } = GROUP_STATUS[props.status];
  return (
    <span className={cn(BASE_CLASS, 'tracking-[0.04em]', className)}>
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
