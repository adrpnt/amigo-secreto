'use client';

import type { JoinResult } from '@amigo-secreto/shared';
import { CircleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';

const GENERIC_ERROR = 'Não foi possível entrar no grupo. Tente de novo.';

async function errorMessage(response: Response): Promise<string> {
  if (response.status !== 409 && response.status !== 429) return GENERIC_ERROR;
  const body = (await response.json().catch(() => ({}))) as {
    message?: unknown;
  };
  return typeof body.message === 'string' ? body.message : GENERIC_ERROR;
}

// Entrar pelo convite. Aprovado vai para o grupo; pendente ou recusado relê a
// página, que mostra o aviso do estado. No 404 o link foi trocado depois de a
// página abrir: relida, ela mostra "Convite não encontrado".
export function JoinButton({
  code,
  requiresApproval,
}: {
  code: string;
  requiresApproval: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setPending(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/invites/${encodeURIComponent(code)}/join`,
        { method: 'POST' },
      );
      if (response.status === 200) {
        const result = (await response.json()) as JoinResult;
        if (result.status === 'APPROVED' && result.groupId) {
          router.push(`/grupos/${result.groupId}`);
        } else {
          router.refresh();
        }
        return;
      }
      if (response.status === 404) {
        router.refresh();
        return;
      }
      setError(await errorMessage(response));
    } catch {
      setError(GENERIC_ERROR);
    }
    setPending(false);
  }

  const label = requiresApproval ? 'Pedir para entrar' : 'Entrar no grupo';

  return (
    <div className="flex flex-col gap-4">
      {requiresApproval && (
        <p className="text-body text-muted-foreground">
          Quem organiza precisa aprovar sua entrada.
        </p>
      )}
      <Button
        className="w-full sm:w-auto sm:self-start"
        disabled={pending}
        onClick={() => void join()}
      >
        {pending ? 'Entrando…' : label}
      </Button>
      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
