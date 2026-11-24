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
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <Icon aria-hidden="true" className="size-5" />
        {label}
      </dt>
      <dd className="pl-7 text-body break-words">{children}</dd>
    </div>
  );
}

// Dados do grupo na aba Grupo, abaixo do cabeçalho e das abas. Campo opcional
// vazio não aparece; os botões são só de quem organiza.
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
    <>
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
    </>
  );
}
