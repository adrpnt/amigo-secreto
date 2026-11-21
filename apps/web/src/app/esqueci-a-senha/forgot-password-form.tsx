'use client';

import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { FieldError } from '@/components/field-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';
import { isValidEmail } from '@/lib/email';

const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';

export function ForgotPasswordForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Antes do primeiro envio o campo não aparece com erro.
  const emailError =
    submitted && !isValidEmail(email) ? 'Informe um e-mail válido.' : undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!isValidEmail(email)) return;

    setFormError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch('/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), next }),
      });
      if (response.status === 202) {
        const body = (await response.json()) as { email: string };
        setSentTo(body.email);
        return;
      }
      if (response.status === 429) {
        const body = (await response.json()) as { message: string };
        setFormError(body.message);
        return;
      }
      setFormError(GENERIC_ERROR);
    } catch {
      setFormError(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <section className="flex flex-col gap-2">
        <h1 className="text-h1">Confira seu e-mail</h1>
        <p className="text-body text-muted-foreground">
          Se houver uma conta com {sentTo}, enviamos um link para redefinir a
          senha.
        </p>
      </section>
    );
  }

  const signInHref = next
    ? `/entrar?next=${encodeURIComponent(next)}`
    : '/entrar';

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Esqueci a senha</h1>
        <p className="text-body text-muted-foreground">
          Informe o e-mail da sua conta. Enviaremos um link para criar uma senha
          nova.
        </p>
      </div>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="forgot-email">E-mail</Label>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'forgot-email-error' : undefined}
          />
          <FieldError id="forgot-email-error" message={emailError} />
        </div>

        {formError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar link'}
        </Button>
      </form>
      <p className="text-body-sm text-muted-foreground">
        Lembrou a senha?{' '}
        <Link href={signInHref} className="text-primary underline">
          Entrar
        </Link>
      </p>
    </section>
  );
}
