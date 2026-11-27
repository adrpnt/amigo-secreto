'use client';

import {
  type ExclusionPair,
  type ExclusionsResponse,
  type GroupStatus,
  validateExclusionInput,
} from '@amigo-secreto/shared';
import { CircleAlert, Lock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { FieldError } from '@/components/field-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';

const GENERIC_ERROR = 'Não foi possível concluir. Tente de novo.';
// Respostas cuja mensagem da API aparece no alerta como veio.
const API_MESSAGE_STATUSES = [404, 409];
const SELECT_CLASS =
  'h-touch-target w-full min-w-0 rounded-md border border-input bg-card px-2.5 py-1 text-base shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20';

function pairLabel(pair: ExclusionPair): string {
  return `${pair.a.name} e ${pair.b.name}`;
}

type ApiError = { field?: string; alert?: string };

async function apiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as {
    message?: unknown;
    fields?: { a?: unknown };
  };
  if (response.status === 400 && typeof body.fields?.a === 'string') {
    return { field: body.fields.a };
  }
  if (
    API_MESSAGE_STATUSES.includes(response.status) &&
    typeof body.message === 'string'
  ) {
    return { alert: body.message };
  }
  return { alert: GENERIC_ERROR };
}

// Pares de quem não tira quem. Só quem organiza vê; com o grupo ABERTO
// adiciona e remove, depois do sorteio só lê.
export function ExclusionEditor({
  groupId,
  status,
  exclusions,
}: {
  groupId: string;
  status: GroupStatus;
  exclusions: ExclusionsResponse;
}) {
  const router = useRouter();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldApiError, setFieldApiError] = useState<string | undefined>();
  const [alert, setAlert] = useState<string | null>(null);

  const editable = status === 'OPEN';
  // Antes de usar "Adicionar par" o campo não aparece com erro; depois, o
  // erro some ao trocar uma das pessoas.
  const fieldError =
    (submitted
      ? validateExclusionInput({ a: a || null, b: b || null }, exclusions.pairs)
          .a
      : undefined) ?? fieldApiError;

  function change(setter: (value: string) => void, value: string) {
    setter(value);
    setSubmitted(false);
    setFieldApiError(undefined);
  }

  async function send(path: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    setAlert(null);
    setFieldApiError(undefined);
    try {
      const response = await apiFetch(path, init);
      if (response.ok) {
        router.refresh();
        return true;
      }
      const error = await apiError(response);
      setFieldApiError(error.field);
      setAlert(error.alert ?? null);
    } catch {
      setAlert(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
    return false;
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setFieldApiError(undefined);
    setAlert(null);
    const input = { a: a || null, b: b || null };
    if (validateExclusionInput(input, exclusions.pairs).a) return;

    const added = await send(`/groups/${groupId}/exclusions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (added) {
      setA('');
      setB('');
      setSubmitted(false);
    }
  }

  function remove(pair: ExclusionPair) {
    void send(`/groups/${groupId}/exclusions/${pair.id}`, {
      method: 'DELETE',
    });
  }

  return (
    <section
      aria-labelledby="exclusions-title"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="exclusions-title" className="text-h3">
          Quem não tira quem
        </h2>
        <p className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <Lock aria-hidden className="size-4 shrink-0" />
          Só você, que organiza, vê estas restrições.
        </p>
      </div>

      {editable && (
        <form
          noValidate
          onSubmit={(event) => void handleAdd(event)}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exclusion-a">Pessoa</Label>
              <select
                id="exclusion-a"
                className={SELECT_CLASS}
                value={a}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? 'exclusion-a-error' : undefined}
                onChange={(event) => change(setA, event.target.value)}
              >
                <option value="">Escolha uma pessoa</option>
                {exclusions.participants.map((person) => (
                  <option key={person.membershipId} value={person.membershipId}>
                    {person.name}
                  </option>
                ))}
              </select>
              <FieldError id="exclusion-a-error" message={fieldError} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exclusion-b">Não tira e não é tirada por</Label>
              <select
                id="exclusion-b"
                className={SELECT_CLASS}
                value={b}
                onChange={(event) => change(setB, event.target.value)}
              >
                <option value="">Escolha uma pessoa</option>
                {exclusions.participants.map((person) => (
                  <option key={person.membershipId} value={person.membershipId}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            type="submit"
            variant="outline"
            className="self-start"
            disabled={busy}
          >
            {busy ? 'Adicionando…' : 'Adicionar par'}
          </Button>
        </form>
      )}

      {alert && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{alert}</AlertDescription>
        </Alert>
      )}

      {exclusions.pairs.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          Nenhum par cadastrado. Todos podem tirar todos, menos a si mesmos.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {exclusions.pairs.map((pair) => (
            <li
              key={pair.id}
              className="flex min-h-touch-target items-center justify-between gap-2"
            >
              {pairLabel(pair)}
              {editable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-touch-target"
                  aria-label={`Remover par ${pairLabel(pair)}`}
                  disabled={busy}
                  onClick={() => remove(pair)}
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {status === 'DRAWN' && (
        <p className="text-body-sm text-muted-foreground">
          Para mudar as restrições, cancele o sorteio.
        </p>
      )}
    </section>
  );
}
