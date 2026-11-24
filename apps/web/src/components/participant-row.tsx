'use client';

import type { GroupStatus, MemberItem } from '@amigo-secreto/shared';
import { Check, EllipsisVertical, X } from 'lucide-react';
import { StatusTag } from '@/components/status-tag';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user-avatar';

const ICON_BUTTON_CLASS = 'size-touch-target';

// Linha de uma pessoa na lista de participantes. Quem organiza (`canManage`)
// decide pedidos com o grupo ABERTO e, na linha de outro aprovado, abre o menu
// de transferir (ABERTO e SORTEADO) e remover (ABERTO). Nunca mostra o e-mail.
export function ParticipantRow({
  member,
  canManage,
  groupStatus,
  onApprove,
  onReject,
  onRemove,
  onTransfer,
}: {
  member: MemberItem;
  canManage: boolean;
  groupStatus: GroupStatus;
  onApprove: () => void;
  onReject: () => void;
  onRemove: () => void;
  onTransfer: () => void;
}) {
  const isOpen = groupStatus === 'OPEN';
  const canDecide = canManage && isOpen && member.status !== 'APPROVED';
  const hasMenu =
    canManage &&
    member.status === 'APPROVED' &&
    !member.isOrganizer &&
    groupStatus !== 'CLOSED';

  return (
    <div className="flex min-w-0 items-center gap-3 py-2">
      <UserAvatar name={member.name} avatarUrl={member.avatarUrl} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className="w-full truncate text-sm leading-5 font-medium">
          {member.name}
        </p>
        {member.isOrganizer ? (
          <StatusTag>Organiza</StatusTag>
        ) : (
          member.status !== 'APPROVED' && <StatusTag status={member.status} />
        )}
      </div>
      {canDecide && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className={ICON_BUTTON_CLASS}
            aria-label={`Aprovar ${member.name}`}
            onClick={onApprove}
          >
            <Check aria-hidden="true" />
          </Button>
          {member.status === 'PENDING' && (
            <Button
              variant="ghost"
              size="icon"
              className={ICON_BUTTON_CLASS}
              aria-label={`Recusar ${member.name}`}
              onClick={onReject}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={ICON_BUTTON_CLASS}
                aria-label={`Ações para ${member.name}`}
              />
            }
          >
            <EllipsisVertical aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-52">
            <DropdownMenuItem onClick={onTransfer}>
              Transferir organização
            </DropdownMenuItem>
            {isOpen && (
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                Remover do grupo
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
