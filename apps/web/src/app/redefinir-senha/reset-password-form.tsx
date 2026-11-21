'use client';

import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { FieldError } from '@/components/field-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';
import { safeNext } from '@/lib/safe-next';

const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';

function validatePassword(password: string): string | undefined {
  if (password.length < 8) {
    return 'A senha precisa ter pelo menos 8 caracteres.';
  }
  if (password.length > 128) return 'A senha pode ter até 128 caracteres.';
  return undefined;
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Sem token na URL o link já é inválido, sem chamar a API.
  const [expired, setExpired] = useState(!token);

  // Antes do primeiro envio o campo não aparece com erro.
  const passwordError = submitted ? validatePassword(password) : undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (validatePassword(password)) return;

    setFormError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch('/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
        redirectOnUnauthorized: false,
      });
      if (response.status === 200) {
        const body = (await response.json()) as { next: string };
        // O botão segue desabilitado até a navegação terminar.
        router.replace(safeNext(body.next));
        router.refresh();
        return;
      }
      if (response.status === 410) setExpired(true);
      else setFormError(GENERIC_ERROR);
    } catch {
      setFormError(GENERIC_ERROR);
    }
    setSubmitting(false);
  }

  if (expired) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="text-h2">Este link expirou ou já foi usado.</h1>
        <Link href="/esqueci-a-senha" className={buttonVariants()}>
          Pedir um novo link
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-h1">Crie uma senha nova</h1>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-password">Senha nova</Label>
          <Input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={
              passwordError
                ? 'reset-password-hint reset-password-error'
                : 'reset-password-hint'
            }
          />
          <p
            id="reset-password-hint"
            className="text-body-sm text-muted-foreground"
          >
            Pelo menos 8 caracteres.
          </p>
          <FieldError id="reset-password-error" message={passwordError} />
        </div>

        {formError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando…' : 'Salvar senha'}
        </Button>
      </form>
    </section>
  );
}
