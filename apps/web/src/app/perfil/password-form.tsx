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

const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';
const WRONG_CURRENT_PASSWORD = 'Senha atual incorreta.';

type PasswordValues = {
  currentPassword: string;
  newPassword: string;
};

type FieldErrors = Partial<Record<keyof PasswordValues, string>>;

function validate(values: PasswordValues, hasPassword: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (hasPassword && values.currentPassword.length === 0) {
    errors.currentPassword = 'Informe sua senha atual.';
  }
  if (values.newPassword.length < 8) {
    errors.newPassword = 'A senha precisa ter pelo menos 8 caracteres.';
  } else if (values.newPassword.length > 128) {
    errors.newPassword = 'A senha pode ter até 128 caracteres.';
  }
  return errors;
}

const EMPTY: PasswordValues = { currentPassword: '', newPassword: '' };

// Troca a senha de quem tem uma e cria a de quem só usa Google.
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<PasswordValues>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  // "Senha atual incorreta." da API, até o campo mudar.
  const [wrongCurrent, setWrongCurrent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = submitted ? validate(values, hasPassword) : {};
  const currentError =
    errors.currentPassword ??
    (wrongCurrent ? WRONG_CURRENT_PASSWORD : undefined);

  function update(field: keyof PasswordValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
    if (field === 'currentPassword') setWrongCurrent(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSaved(false);
    setWrongCurrent(false);
    setFormError(null);
    if (Object.keys(validate(values, hasPassword)).length > 0) return;

    setSubmitting(true);
    try {
      const response = await apiFetch('/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          hasPassword ? values : { newPassword: values.newPassword },
        ),
      });
      if (response.status === 200) {
        setValues(EMPTY);
        setSubmitted(false);
        setSaved(true);
        // Quem criou a senha passa a ver o campo da senha atual.
        if (!hasPassword) router.refresh();
        return;
      }
      const body = (await response.json().catch(() => null)) as {
        message?: unknown;
      } | null;
      if (response.status === 400 && body?.message === WRONG_CURRENT_PASSWORD) {
        setWrongCurrent(true);
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
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3">Senha</h2>
        {!hasPassword && (
          <p className="text-body-sm text-muted-foreground">
            Crie uma senha para entrar também com e-mail e senha.
          </p>
        )}
      </div>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        {hasPassword && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current-password">Senha atual</Label>
            <Input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={values.currentPassword}
              onChange={(event) =>
                update('currentPassword', event.target.value)
              }
              aria-invalid={currentError ? true : undefined}
              aria-describedby={
                currentError ? 'current-password-error' : undefined
              }
            />
            <FieldError id="current-password-error" message={currentError} />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">Senha nova</Label>
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={(event) => update('newPassword', event.target.value)}
            aria-invalid={errors.newPassword ? true : undefined}
            aria-describedby={
              errors.newPassword
                ? 'new-password-hint new-password-error'
                : 'new-password-hint'
            }
          />
          <p
            id="new-password-hint"
            className="text-body-sm text-muted-foreground"
          >
            Pelo menos 8 caracteres.
          </p>
          <FieldError id="new-password-error" message={errors.newPassword} />
        </div>

        {formError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? 'Salvando…'
              : hasPassword
                ? 'Trocar senha'
                : 'Criar senha'}
          </Button>
          <p role="status" className="text-body-sm text-muted-foreground">
            {saved && 'Senha alterada.'}
          </p>
        </div>
      </form>
    </section>
  );
}
