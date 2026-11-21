'use client';

import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';

type SignUpValues = {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
};

type FieldName = keyof SignUpValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mesmas regras do cadastro na API, com as mensagens do site.
function validate(values: SignUpValues): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();

  if (name.length === 0) errors.name = 'Informe seu nome.';
  else if (name.length > 80) errors.name = 'Use até 80 caracteres.';

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors.email = 'Informe um e-mail válido.';
  }

  if (values.password.length < 8) {
    errors.password = 'A senha precisa ter pelo menos 8 caracteres.';
  } else if (values.password.length > 128) {
    errors.password = 'A senha pode ter até 128 caracteres.';
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = 'Marque esta caixa para criar a conta.';
  }
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      className="flex items-center gap-1.5 text-body-sm text-destructive"
    >
      <CircleAlert aria-hidden className="size-4 shrink-0" />
      {message}
    </p>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [values, setValues] = useState<SignUpValues>({
    name: '',
    email: '',
    password: '',
    acceptTerms: false,
  });
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Antes do primeiro envio nenhum campo aparece com erro.
  const errors = submitted ? validate(values) : {};

  function update<K extends FieldName>(field: K, value: SignUpValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (Object.keys(validate(values)).length > 0) return;

    setSubmitting(true);
    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, marketingOptIn, next }),
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
          Enviamos um e-mail para {sentTo}. Abra o link para confirmar sua
          conta.
        </p>
      </section>
    );
  }

  const signInHref = next
    ? `/entrar?next=${encodeURIComponent(next)}`
    : '/entrar';

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-h1">Criar conta</h1>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-name">Nome</Label>
          <Input
            id="signup-name"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'signup-name-error' : undefined}
          />
          <FieldError id="signup-name-error" message={errors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">E-mail</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
          />
          <FieldError id="signup-email-error" message={errors.email} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">Senha</Label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => update('password', event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={
              errors.password
                ? 'signup-password-hint signup-password-error'
                : 'signup-password-hint'
            }
          />
          <p
            id="signup-password-hint"
            className="text-body-sm text-muted-foreground"
          >
            Pelo menos 8 caracteres.
          </p>
          <FieldError id="signup-password-error" message={errors.password} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="items-start font-normal text-body-sm">
            <Checkbox
              className="mt-0.5"
              checked={values.acceptTerms}
              onCheckedChange={(checked) => update('acceptTerms', checked)}
              aria-invalid={errors.acceptTerms ? true : undefined}
              aria-describedby={
                errors.acceptTerms ? 'signup-terms-error' : undefined
              }
            />
            <span>
              Li e aceito os{' '}
              <Link href="/termos" target="_blank" className="underline">
                Termos de uso
              </Link>{' '}
              e a{' '}
              <Link href="/privacidade" target="_blank" className="underline">
                Política de privacidade
              </Link>
              , e tenho 18 anos ou autorização dos meus responsáveis
            </span>
          </Label>
          <FieldError id="signup-terms-error" message={errors.acceptTerms} />
        </div>

        <Label className="items-start font-normal text-body-sm">
          <Checkbox
            className="mt-0.5"
            checked={marketingOptIn}
            onCheckedChange={(checked) => setMarketingOptIn(checked)}
          />
          <span>Quero receber novidades do Amigo Secreto por e-mail.</span>
        </Label>

        {formError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
      <p className="text-body-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href={signInHref} className="text-primary underline">
          Entrar
        </Link>
      </p>
    </section>
  );
}
