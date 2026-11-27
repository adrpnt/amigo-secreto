'use client';

import type {
  DrawPanel as DrawPanelData,
  GroupDetail,
} from '@amigo-secreto/shared';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';
import { drawConditionLabels, drawnAtLabel } from '@/lib/draw-format';

const GENERIC_ERROR = 'Não foi possível concluir. Tente de novo.';
// Respostas cuja mensagem da API aparece como veio, por ação.
const API_MESSAGE_STATUSES = { draw: [409, 429], cancel: [409] };

type Action = 'draw' | 'cancel';

async function errorMessage(
  response: Response,
  statuses: number[],
): Promise<string> {
  if (!statuses.includes(response.status)) return GENERIC_ERROR;
  const body = (await response.json().catch(() => ({}))) as {
    message?: unknown;
  };
  return typeof body.message === 'string' ? body.message : GENERIC_ERROR;
}

function pairsToReviewText(pairs: DrawPanelData['pairsToReview']): string {
  const names = pairs.map((pair) => `${pair.a.name} e ${pair.b.name}`);
  return `Revise estes pares: ${names.join('; ')}.`;
}

// Painel de quem organiza: antes do sorteio, as condições e "Sortear"; depois,
// quando foi feito e, com o grupo SORTEADO, "Cancelar sorteio".
export function DrawPanel({
  group,
  panel,
}: {
  group: Pick<GroupDetail, 'id' | 'name'>;
  panel: DrawPanelData;
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

  async function run(next: Action) {
    setPending(true);
    try {
      const response = await apiFetch(`/groups/${group.id}/draw`, {
        method: next === 'draw' ? 'POST' : 'DELETE',
      });
      const succeeded =
        next === 'draw' ? response.status === 201 : response.status === 204;
      if (succeeded) {
        setPending(false);
        setAction(null);
        router.refresh();
        return;
      }
      fail(await errorMessage(response, API_MESSAGE_STATUSES[next]));
    } catch {
      fail(GENERIC_ERROR);
    }
  }

  const conditions = drawConditionLabels(panel);
  const canDraw = conditions.every((condition) => condition.met);

  return (
    <section
      aria-labelledby="draw-title"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
    >
      <h2 id="draw-title" className="text-h3">
        Sorteio
      </h2>

      {panel.status === 'OPEN' ? (
        <>
          <ul className="flex flex-col gap-2">
            {conditions.map((condition) => (
              <li
                key={condition.label}
                className="flex items-center gap-2 text-body-sm"
              >
                {condition.met ? (
                  <CircleCheck
                    aria-hidden
                    className="size-4 shrink-0 text-success"
                  />
                ) : (
                  <TriangleAlert
                    aria-hidden
                    className="size-4 shrink-0 text-warning"
                  />
                )}
                {condition.label}
              </li>
            ))}
          </ul>

          {panel.pairsToReview.length > 0 && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>
                {pairsToReviewText(panel.pairsToReview)}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="festive"
              className="w-full sm:w-auto sm:self-start"
              disabled={!canDraw}
              onClick={() => open('draw')}
            >
              Sortear
            </Button>
            <p className="text-body-sm text-muted-foreground">
              Ninguém vê quem os outros tiraram, nem você.
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {panel.drawnAt && <p>{drawnAtLabel(panel.drawnAt)}</p>}
          {panel.status === 'DRAWN' && (
            <>
              <p className="text-body-sm text-muted-foreground">
                Cada pessoa já pode ver quem tirou, aqui e por e-mail.
              </p>
              <Button
                variant="outline"
                className="w-full sm:w-auto sm:self-start"
                onClick={() => open('cancel')}
              >
                Cancelar sorteio
              </Button>
            </>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ConfirmDialog
        open={action === 'draw'}
        tone="primary"
        title={`Fazer o sorteio de ${group.name}?`}
        description="Cada pessoa recebe por e-mail quem tirou. Depois do sorteio, ninguém entra nem sai do grupo sem cancelar o sorteio."
        confirmLabel="Sortear"
        cancelLabel="Ainda não"
        pendingLabel={pending ? 'Sorteando…' : undefined}
        onConfirm={() => void run('draw')}
        onCancel={() => setAction(null)}
      />
      <ConfirmDialog
        open={action === 'cancel'}
        title={`Cancelar o sorteio de ${group.name}?`}
        description="Quem já viu o resultado pode ter guardado o nome. Todos recebem um e-mail avisando que o sorteio foi cancelado, e o grupo volta a aceitar entradas."
        confirmLabel="Cancelar sorteio"
        cancelLabel="Manter sorteio"
        pendingLabel={pending ? 'Cancelando…' : undefined}
        onConfirm={() => void run('cancel')}
        onCancel={() => setAction(null)}
      />
    </section>
  );
}
