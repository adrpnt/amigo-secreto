import {
  formatBrasiliaDateTime,
  type GroupDetail,
} from '@amigo-secreto/shared';
import {
  CalendarClock,
  Gift,
  type LucideIcon,
  MapPin,
  PartyPopper,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusTag } from '@/components/status-tag';
import { formatGiftValue } from '@/lib/group-format';
import { GroupActions } from './group-actions';

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        aria-hidden="true"
        className="mt-0.5 size-5 text-muted-foreground"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-body-sm text-muted-foreground">{label}</dt>
        <dd className="text-body break-words">{children}</dd>
      </div>
    </div>
  );
}

// Dados do grupo para quem participa dele. Campo opcional vazio não aparece;
// os botões e "Entrada com aprovação" são só de quem organiza.
export function GroupDetailView({ group }: { group: GroupDetail }) {
  const giftValue =
    group.giftMinValue !== null && group.giftMaxValue !== null
      ? formatGiftValue(group.giftMinValue, group.giftMaxValue)
      : null;
  const hasLocation = group.eventLocation !== null || group.isOnlineEvent;
  const hasFields =
    giftValue !== null ||
    group.drawScheduledAt !== null ||
    group.eventAt !== null ||
    hasLocation;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="min-w-0 text-h1 break-words">{group.name}</h1>
          <StatusTag status={group.status} />
          {group.isOrganizer && group.requiresApproval && (
            <StatusTag>Entrada com aprovação</StatusTag>
          )}
        </div>
        <p className="text-body text-muted-foreground">
          Organizado por {group.owner.name}
        </p>
      </div>

      {group.description !== null && (
        <p className="text-body break-words whitespace-pre-line">
          {group.description}
        </p>
      )}

      {hasFields && (
        <dl className="flex flex-col gap-4">
          {giftValue !== null && (
            <Field icon={Gift} label="Valor do presente">
              {giftValue}
            </Field>
          )}
          {group.drawScheduledAt !== null && (
            <Field icon={CalendarClock} label="Sorteio previsto">
              {formatBrasiliaDateTime(group.drawScheduledAt)}
            </Field>
          )}
          {group.eventAt !== null && (
            <Field icon={PartyPopper} label="Confraternização">
              {formatBrasiliaDateTime(group.eventAt)}
            </Field>
          )}
          {hasLocation && (
            <Field icon={MapPin} label="Local">
              <span className="flex flex-wrap items-center gap-2">
                {group.eventLocation}
                {group.isOnlineEvent && <StatusTag>Evento online</StatusTag>}
              </span>
            </Field>
          )}
        </dl>
      )}

      {group.isOrganizer && <GroupActions group={group} />}
    </main>
  );
}
