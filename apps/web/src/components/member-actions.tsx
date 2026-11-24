'use client';

import type {
  GroupStatus,
  MemberItem,
  MembersPage,
} from '@amigo-secreto/shared';
import { CircleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ParticipantsList } from '@/components/participants-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch } from '@/lib/api-fetch';

const GENERIC_ERROR = 'Não foi possível concluir. Tente de novo.';
// Respostas cuja mensagem da API aparece como veio.
const API_MESSAGE_STATUSES = [403, 404, 409];

type Confirmation = { kind: 'remove' | 'transfer'; member: MemberItem };

async function errorMessage(response: Response): Promise<string> {
  if (!API_MESSAGE_STATUSES.includes(response.status)) return GENERIC_ERROR;
  const body = (await response.json().catch(() => ({}))) as {
    message?: unknown;
  };
  return typeof body.message === 'string' ? body.message : GENERIC_ERROR;
}

function dialogTexts({ kind, member }: Confirmation) {
  if (kind === 'remove') {
    return {
      title: `Remover ${member.name} do grupo?`,
      description: `${member.name} sai do grupo e só volta se você aprovar.`,
      confirmLabel: 'Remover do grupo',
      cancelLabel: 'Manter no grupo',
      pendingLabel: 'Removendo…',
      tone: 'destructive' as const,
    };
  }
  return {
    title: `Passar a organização para ${member.name}?`,
    description: `${member.name} passa a cuidar do grupo, dos convites e do sorteio. Você continua no grupo como participante.`,
    confirmLabel: 'Transferir organização',
    cancelLabel: 'Manter organização',
    pendingLabel: 'Transferindo…',
    tone: 'primary' as const,
  };
}

// Lista de participantes com as ações de quem organiza: aprovar e recusar na
// hora; remover e transferir depois da confirmação. Aprovar, recusar e remover
// recarregam a lista; transferir recarrega a página, que perde as ações.
export function MemberActions({
  groupId,
  initialPage,
  canManage,
  groupStatus,
}: {
  groupId: string;
  initialPage: MembersPage;
  canManage: boolean;
  groupStatus: GroupStatus;
}) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // `confirmation` fica depois de fechar, para o texto não sumir na animação.
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const membersPath = `/groups/${groupId}/members`;

  function reload() {
    setReloadKey((key) => key + 1);
  }

  async function fail(response: Response) {
    setError(await errorMessage(response));
    // 404: a participação mudou ou sumiu; a lista mostra o estado atual.
    if (response.status === 404) reload();
  }

  async function decide(member: MemberItem, decision: 'approve' | 'reject') {
    setError(null);
    try {
      const response = await apiFetch(
        `${membersPath}/${member.membershipId}/${decision}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: member.status }),
        },
      );
      if (response.ok) {
        reload();
        return;
      }
      await fail(response);
    } catch {
      setError(GENERIC_ERROR);
    }
  }

  function ask(kind: Confirmation['kind'], member: MemberItem) {
    setError(null);
    setConfirmation({ kind, member });
    setConfirming(true);
  }

  async function confirm() {
    if (!confirmation) return;
    const { kind, member } = confirmation;
    setPending(true);
    try {
      const response =
        kind === 'remove'
          ? await apiFetch(`${membersPath}/${member.membershipId}`, {
              method: 'DELETE',
            })
          : await apiFetch(`/groups/${groupId}/transfer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ membershipId: member.membershipId }),
            });
      setPending(false);
      setConfirming(false);
      if (response.ok) {
        if (kind === 'remove') reload();
        else router.refresh();
        return;
      }
      await fail(response);
    } catch {
      setPending(false);
      setConfirming(false);
      setError(GENERIC_ERROR);
    }
  }

  const texts = confirmation ? dialogTexts(confirmation) : null;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ParticipantsList
        groupId={groupId}
        initialPage={initialPage}
        canManage={canManage}
        groupStatus={groupStatus}
        reloadKey={reloadKey}
        onApprove={(member) => void decide(member, 'approve')}
        onReject={(member) => void decide(member, 'reject')}
        onRemove={(member) => ask('remove', member)}
        onTransfer={(member) => ask('transfer', member)}
      />

      {texts && (
        <ConfirmDialog
          open={confirming}
          title={texts.title}
          description={texts.description}
          confirmLabel={texts.confirmLabel}
          cancelLabel={texts.cancelLabel}
          tone={texts.tone}
          pendingLabel={pending ? texts.pendingLabel : undefined}
          onConfirm={() => void confirm()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
