import Link from 'next/link';
import type { GroupSummary } from '@amigo-secreto/shared';
import { Calendar, Clock, UserRound, Users } from 'lucide-react';
import { StatusTag } from '@/components/status-tag';
import { cardDateLine, participantsLabel } from '@/lib/group-format';
import { cn } from '@/lib/utils';

const CARD_CLASS =
  'flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm';

// "3 participantes" e, para quem organiza com pedidos, ", 2 pendentes".
function peopleLine(group: GroupSummary): string {
  const people = participantsLabel(group.participantCount);
  const pending = group.pendingCount ?? 0;
  if (pending === 0) return people;
  return `${people}, ${pending === 1 ? '1 pendente' : `${pending} pendentes`}`;
}

// Pedido pendente: a pessoa ainda não vê o grupo, então o card não é link.
function PendingGroupCard({ group }: { group: GroupSummary }) {
  return (
    <div className={CARD_CLASS}>
      <h3 className="min-w-0 text-xl leading-7 font-semibold text-balance break-words">
        {group.name}
      </h3>
      <p className="flex items-center gap-2 text-sm leading-5 text-muted-foreground">
        <UserRound aria-hidden="true" className="size-4" />
        Organizado por {group.organizerName}
      </p>
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-warning-subtle px-2.5 py-1 text-xs leading-4 font-medium whitespace-nowrap text-warning-subtle-foreground">
          <Clock aria-hidden="true" className="size-3.5" />
          Aguardando aprovação
        </span>
      </div>
    </div>
  );
}

// Card de um grupo em "Meus grupos". O card inteiro é o link para o grupo, sem
// botões dentro.
export function GroupCard({ group }: { group: GroupSummary }) {
  if (group.membershipStatus === 'PENDING') {
    return <PendingGroupCard group={group} />;
  }

  return (
    <Link
      href={`/grupos/${group.id}`}
      className={cn(
        CARD_CLASS,
        'transition-[box-shadow,border-color] duration-150 ease-out outline-none hover:border-input hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="min-w-0 text-xl leading-7 font-semibold text-balance break-words">
          {group.name}
        </h3>
        <StatusTag status={group.status} />
      </div>
      <p className="flex items-center gap-2 text-sm leading-5 text-muted-foreground">
        <Users aria-hidden="true" className="size-4" />
        {peopleLine(group)}
      </p>
      <p className="flex items-center gap-2 text-sm leading-5 text-muted-foreground">
        <Calendar aria-hidden="true" className="size-4" />
        {cardDateLine(group)}
      </p>
      {group.isOrganizer && (
        <div>
          <StatusTag>Você organiza</StatusTag>
        </div>
      )}
    </Link>
  );
}
