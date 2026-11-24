'use client';

import type { GroupDetail } from '@amigo-secreto/shared';
import { CircleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';

const GENERIC_ERROR = 'Não foi possível concluir. Tente de novo.';

async function errorMessage(response: Response): Promise<string> {
  if (response.status !== 409) return GENERIC_ERROR;
  const body = (await response.json().catch(() => ({}))) as {
    message?: unknown;
  };
  return typeof body.message === 'string' ? body.message : GENERIC_ERROR;
}

// "Sair do grupo" para quem participa sem organizar, enquanto o grupo está
// ABERTO. Quem organiza transfere a organização antes de sair.
export function LeaveGroup({
  group,
}: {
  group: Pick<GroupDetail, 'id' | 'name' | 'status' | 'isOrganizer'>;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (group.isOrganizer || group.status !== 'OPEN') return null;

  function fail(message: string) {
    setPending(false);
    setConfirming(false);
    setError(message);
  }

  async function leave() {
    setPending(true);
    try {
      const response = await apiFetch(`/groups/${group.id}/leave`, {
        method: 'POST',
      });
      // 404: a pessoa já não participa do grupo.
      if (response.status === 204 || response.status === 404) {
        router.push('/grupos');
        return;
      }
      fail(await errorMessage(response));
    } catch {
      fail(GENERIC_ERROR);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          Sair do grupo
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Sair do grupo ${group.name}?`}
        description="Você deixa de ver o grupo. Para voltar, use o link de convite de novo."
        confirmLabel="Sair do grupo"
        cancelLabel="Ficar no grupo"
        pendingLabel={pending ? 'Saindo…' : undefined}
        onConfirm={() => void leave()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
