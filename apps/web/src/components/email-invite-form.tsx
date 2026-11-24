'use client';

import {
  type InviteEmailsResult,
  validateInviteEmails,
} from '@amigo-secreto/shared';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { FieldError } from '@/components/field-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-fetch';

const GENERIC_ERROR = 'Não foi possível enviar os convites. Tente de novo.';
// Respostas cuja mensagem da API aparece como veio.
const API_MESSAGE_STATUSES = [403, 409, 429];

function sentMessage(count: number): string {
  return count === 1
    ? 'Convite enviado para 1 e-mail.'
    : `Convites enviados para ${count} e-mails.`;
}

// Convite por e-mail de quem organiza: todos recebem o link do grupo.
export function EmailInviteForm({ groupId }: { groupId: string }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Antes do primeiro envio o campo não aparece com erro; depois, o erro some
  // ao corrigir.
  const error =
    (submitted ? validateInviteEmails(text).fields.emails : undefined) ??
    apiError;

  function change(value: string) {
    setText(value);
    setApiError(undefined);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setApiError(undefined);
    setFormError(null);
    setSuccess(null);
    if (validateInviteEmails(text).fields.emails) return;

    setSubmitting(true);
    try {
      const response = await apiFetch(`/groups/${groupId}/invite/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: text }),
      });
      if (response.ok) {
        const result = (await response.json()) as InviteEmailsResult;
        setText('');
        setSubmitted(false);
        setSuccess(sentMessage(result.count));
      } else {
        const body = (await response.json().catch(() => ({}))) as {
          message?: unknown;
          fields?: { emails?: string };
        };
        if (response.status === 400 && body.fields?.emails) {
          setApiError(body.fields.emails);
        } else if (
          API_MESSAGE_STATUSES.includes(response.status) &&
          typeof body.message === 'string'
        ) {
          setFormError(body.message);
        } else {
          setFormError(GENERIC_ERROR);
        }
      }
    } catch {
      setFormError(GENERIC_ERROR);
    }
    setSubmitting(false);
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-emails">E-mails</Label>
        <Textarea
          id="invite-emails"
          value={text}
          placeholder="ana@exemplo.com, bruno@exemplo.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? 'invite-emails-error' : 'invite-emails-hint'
          }
          onChange={(event) => change(event.target.value)}
        />
        <p
          id="invite-emails-hint"
          className="text-body-sm text-muted-foreground"
        >
          Separe por vírgula ou um por linha. Todos recebem o mesmo link.
        </p>
        <FieldError id="invite-emails-error" message={error} />
      </div>

      {formError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="self-start" disabled={submitting}>
        {submitting ? 'Enviando…' : 'Enviar convites'}
      </Button>

      {success && (
        <Alert variant="success" role="status">
          <CircleCheck aria-hidden />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
