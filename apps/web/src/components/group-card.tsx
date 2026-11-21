import Link from 'next/link';
import type { GroupSummary } from '@amigo-secreto/shared';
import { Calendar, Users } from 'lucide-react';
import { StatusTag } from '@/components/status-tag';
import { cardDateLine, participantsLabel } from '@/lib/group-format';

// Card de um grupo em "Meus grupos". O card inteiro é o link para o grupo, sem
// botões dentro.
export function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      href={`/grupos/${group.id}`}
      className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-[box-shadow,border-color] duration-150 ease-out outline-none hover:border-input hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="min-w-0 text-xl leading-7 font-semibold text-balance break-words">
          {group.name}
        </h3>
        <StatusTag status={group.status} />
      </div>
      <p className="flex items-center gap-2 text-sm leading-5 text-muted-foreground">
        <Users aria-hidden="true" className="size-4" />
        {participantsLabel(group.participantCount)}
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
