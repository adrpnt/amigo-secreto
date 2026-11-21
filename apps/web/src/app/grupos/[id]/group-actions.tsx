'use client';

import type { GroupDetail } from '@amigo-secreto/shared';
import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';

const GENERIC_ERROR = 'Não foi possível concluir. Tente de novo.';
// Respostas cuja mensagem da API aparece como veio.
const API_MESSAGE_STATUSES = [403, 409];

type Action = 'delete' | 'close';

async function errorMessage(response: Response): Promise<string> {
  if (!API_MESSAGE_STATUSES.includes(response.status)) return GENERIC_ERROR;
  const body = (await response.json().catch(() => ({}))) as {
    message?: unknown;
  };
  return typeof body.message === 'string' ? body.message : GENERIC_ERROR;
}

// Botões de quem organiza o grupo, conforme o status: ABERTO edita e exclui,
// SORTEADO também encerra, ENCERRADO só exclui.
export function GroupActions({
  group,
}: {
  group: Pick<GroupDetail, 'id' | 'name' | 'status'>;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(next: Action) {
    setError(null);
    setAction(next);
  }

  function fail(message: string) {
    setPending(false);
    setAction(null);
    setError(message);
  }

  async function deleteGroup() {
    setPending(true);
    try {
      const response = await apiFetch(`/groups/${group.id}`, {
        method: 'DELETE',
      });
      // 404: outro pedido já excluiu o grupo.
      if (response.status === 204 || response.status === 404) {
        router.push('/grupos');
        return;
      }
      fail(await errorMessage(response));
    } catch {
      fail(GENERIC_ERROR);
    }
  }

  async function closeGroup() {
    setPending(true);
    try {
      const response = await apiFetch(`/groups/${group.id}/close`, {
        method: 'POST',
      });
      if (response.status === 200) {
        setPending(false);
        setAction(null);
        router.refresh();
        return;
      }
      fail(await errorMessage(response));
    } catch {
      fail(GENERIC_ERROR);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {group.status !== 'CLOSED' && (
          <Link
            href={`/grupos/${group.id}/editar`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Editar grupo
          </Link>
        )}
        {group.status === 'DRAWN' && (
          <Button variant="outline" onClick={() => open('close')}>
            Encerrar grupo
          </Button>
        )}
        <Button variant="destructive" onClick={() => open('delete')}>
          Excluir grupo
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ConfirmDialog
        open={action === 'delete'}
        title={`Excluir o grupo ${group.name}?`}
        description="O grupo e tudo o que há nele serão apagados para todos os participantes. Não dá para desfazer."
        confirmLabel="Excluir grupo"
        cancelLabel="Manter grupo"
        pendingLabel={pending ? 'Excluindo…' : undefined}
        onConfirm={() => void deleteGroup()}
        onCancel={() => setAction(null)}
      />
      <ConfirmDialog
        open={action === 'close'}
        tone="primary"
        title={`Encerrar o grupo ${group.name}?`}
        description="O grupo vai para Encerrados e não poderá mais ser editado nem reaberto."
        confirmLabel="Encerrar grupo"
        cancelLabel="Manter grupo"
        pendingLabel={pending ? 'Encerrando…' : undefined}
        onConfirm={() => void closeGroup()}
        onCancel={() => setAction(null)}
      />
    </div>
  );
}
