import type { ReactNode } from 'react';
import type { GroupStatus, MembershipStatus } from '@amigo-secreto/shared';
import {
  Archive,
  Clock,
  Gift,
  LockOpen,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TagStatus = GroupStatus | Exclude<MembershipStatus, 'APPROVED'>;

const STATUS: Record<
  TagStatus,
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
  PENDING: {
    label: 'Pendente',
    icon: Clock,
    className: 'bg-warning-subtle text-warning-subtle-foreground',
  },
  REJECTED: {
    label: 'Recusado',
    icon: X,
    className: 'bg-destructive-subtle text-destructive-subtle-foreground',
  },
};

// Status de grupo em maiúsculas; status de participação em frase normal.
const UPPERCASE = new Set<TagStatus>(['OPEN', 'DRAWN', 'CLOSED']);

const BASE_CLASS =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs leading-4 font-medium whitespace-nowrap';

type StatusTagProps =
  | { status: TagStatus; children?: never }
  | { status?: never; children: ReactNode };

// Status do grupo ou da participação, sempre com ícone e palavra. Sem status, a
// tag é neutra e mostra o texto recebido ("Você organiza").
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

  const { label, icon: Icon, className } = STATUS[props.status];
  return (
    <span
      className={cn(
        BASE_CLASS,
        UPPERCASE.has(props.status) && 'tracking-[0.04em]',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
