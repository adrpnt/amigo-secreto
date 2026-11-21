'use client';

import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useState } from 'react';
import { FieldError } from '@/components/field-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';
import { isValidEmail } from '@/lib/email';
import { safeNext } from '@/lib/safe-next';

type SignInValues = {
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof SignInValues, string>>;

const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';

function validate(values: SignInValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!isValidEmail(values.email)) errors.email = 'Informe um e-mail válido.';
  if (values.password.length === 0) errors.password = 'Informe sua senha.';
  return errors;
}

function withNext(path: string, next?: string): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

export function SignInForm({
  next,
  initialError,
  google,
}: {
  next?: string;
  // Erro do retorno do Google, mostrado até o próximo envio.
  initialError?: string;
  // Entrada pelo Google, mostrada entre o título e o formulário.
  google?: ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = useState<SignInValues>({
    email: '',
    password: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    initialError ?? null,
  );

  // Antes do primeiro envio nenhum campo aparece com erro.
  const errors = submitted ? validate(values) : {};

  function update(field: keyof SignInValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values)).length > 0) return;

    setFormError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password,
        }),
        redirectOnUnauthorized: false,
      });
      if (response.status === 200) {
        // O botão segue desabilitado até a navegação terminar.
        router.replace(safeNext(next));
        router.refresh();
        return;
      }
      if (response.status === 401 || response.status === 429) {
        const body = (await response.json()) as { message: string };
        setFormError(body.message);
      } else {
        setFormError(GENERIC_ERROR);
      }
    } catch {
      setFormError(GENERIC_ERROR);
    }
    setSubmitting(false);
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-h1">Entrar</h1>
      {google}
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signin-email">E-mail</Label>
          <Input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'signin-email-error' : undefined}
          />
          <FieldError id="signin-email-error" message={errors.email} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signin-password">Senha</Label>
          <Input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(event) => update('password', event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={
              errors.password ? 'signin-password-error' : undefined
            }
          />
          <FieldError id="signin-password-error" message={errors.password} />
          <Link
            href={withNext('/esqueci-a-senha', next)}
            className="self-start text-body-sm text-primary underline"
          >
            Esqueci a senha
          </Link>
        </div>

        {formError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="text-body-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link
          href={withNext('/cadastro', next)}
          className="text-primary underline"
        >
          Criar conta
        </Link>
      </p>
    </section>
  );
}
