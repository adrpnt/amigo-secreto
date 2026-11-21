'use client';

import { CircleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { FieldError } from '@/components/field-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';
import { isValidEmail } from '@/lib/email';

const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';
const WRONG_PASSWORD = 'Senha atual incorreta.';
const SAME_EMAIL = 'Este já é o seu e-mail.';

type EmailChangeValues = {
  newEmail: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof EmailChangeValues, string>>;

function validate(values: EmailChangeValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!isValidEmail(values.newEmail)) {
    errors.newEmail = 'Informe um e-mail válido.';
  }
  if (values.password.length === 0) {
    errors.password = 'Informe sua senha atual.';
  }
  return errors;
}

const EMPTY: EmailChangeValues = { newEmail: '', password: '' };

function EmailChangeForm() {
  const [values, setValues] = useState<EmailChangeValues>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Erros de campo que só a API conhece, até o campo mudar.
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const localErrors = submitted ? validate(values) : {};
  const errors: FieldErrors = {
    newEmail: localErrors.newEmail ?? serverErrors.newEmail,
    password: localErrors.password ?? serverErrors.password,
  };

  function update(field: keyof EmailChangeValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
    setSentTo(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSentTo(null);
    setServerErrors({});
    setFormError(null);
    if (Object.keys(validate(values)).length > 0) return;

    setSubmitting(true);
    try {
      const response = await apiFetch('/users/me/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail: values.newEmail.trim(),
          password: values.password,
        }),
      });
      if (response.status === 202) {
        const body = (await response.json()) as { email: string };
        setValues(EMPTY);
        setSubmitted(false);
        setSentTo(body.email);
        return;
      }
      const body = (await response.json().catch(() => null)) as {
        message?: unknown;
      } | null;
      if (response.status === 400 && body?.message === WRONG_PASSWORD) {
        setServerErrors({ password: WRONG_PASSWORD });
      } else if (response.status === 400 && body?.message === SAME_EMAIL) {
        setServerErrors({ newEmail: SAME_EMAIL });
      } else if (response.status === 429 && typeof body?.message === 'string') {
        setFormError(body.message);
      } else {
        setFormError(GENERIC_ERROR);
      }
    } catch {
      setFormError(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-email">E-mail novo</Label>
        <Input
          id="new-email"
          name="newEmail"
          type="email"
          autoComplete="email"
          value={values.newEmail}
          onChange={(event) => update('newEmail', event.target.value)}
          aria-invalid={errors.newEmail ? true : undefined}
          aria-describedby={errors.newEmail ? 'new-email-error' : undefined}
        />
        <FieldError id="new-email-error" message={errors.newEmail} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email-change-password">Senha atual</Label>
        <Input
          id="email-change-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => update('password', event.target.value)}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={
            errors.password ? 'email-change-password-error' : undefined
          }
        />
        <FieldError
          id="email-change-password-error"
          message={errors.password}
        />
      </div>

      {formError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Trocar e-mail'}
        </Button>
        <p role="status" className="text-body-sm text-muted-foreground">
          {sentTo && `Enviamos um link para ${sentTo}.`}
        </p>
      </div>
    </form>
  );
}

function SignOutEverywhere() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOutEverywhere() {
    setFailed(false);
    setSubmitting(true);
    try {
      const response = await apiFetch('/auth/logout-all', { method: 'POST' });
      if (response.status === 204) {
        // O botão segue desabilitado até a navegação terminar.
        router.replace('/entrar');
        router.refresh();
        return;
      }
    } catch {
      // Cai na mensagem abaixo.
    }
    setFailed(true);
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted-foreground">
        Encerra sua sessão em todos os aparelhos, inclusive neste.
      </p>
      {failed && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{GENERIC_ERROR}</AlertDescription>
        </Alert>
      )}
      <Button
        variant="outline"
        className="self-start"
        disabled={submitting}
        onClick={() => void signOutEverywhere()}
      >
        Sair de todos os dispositivos
      </Button>
    </div>
  );
}

// Troca de e-mail e encerramento de todas as sessões, no fim do perfil.
export function AccountSecurity({ hasPassword }: { hasPassword: boolean }) {
  return (
    <>
      <section aria-labelledby="email-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="email-title" className="text-h3">
            E-mail
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {hasPassword
              ? 'O e-mail atual continua valendo até você abrir o link enviado para o novo.'
              : 'Crie uma senha antes de trocar o e-mail.'}
          </p>
        </div>
        {hasPassword && <EmailChangeForm />}
      </section>

      <section aria-labelledby="sessions-title" className="flex flex-col gap-4">
        <h2 id="sessions-title" className="text-h3">
          Sessões
        </h2>
        <SignOutEverywhere />
      </section>
    </>
  );
}
