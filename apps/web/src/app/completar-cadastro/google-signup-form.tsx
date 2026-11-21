'use client';

import { CircleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { FieldError } from '@/components/field-error';
import { TermsConsent } from '@/components/terms-consent';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';
import { safeNext } from '@/lib/safe-next';

type GoogleSignUpValues = {
  name: string;
  acceptTerms: boolean;
};

type FieldName = keyof GoogleSignUpValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';

// Mesmas regras do cadastro, com as mensagens do site.
function validate(values: GoogleSignUpValues): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();

  if (name.length === 0) errors.name = 'Informe seu nome.';
  else if (name.length > 80) errors.name = 'Use até 80 caracteres.';

  if (!values.acceptTerms) {
    errors.acceptTerms = 'Marque esta caixa para criar a conta.';
  }
  return errors;
}

export function GoogleSignUpForm({
  googleName,
  googleEmail,
}: {
  googleName: string;
  googleEmail: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<GoogleSignUpValues>({
    name: googleName,
    acceptTerms: false,
  });
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Antes do primeiro envio nenhum campo aparece com erro.
  const errors = submitted ? validate(values) : {};

  function update<K extends FieldName>(field: K, value: GoogleSignUpValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (Object.keys(validate(values)).length > 0) return;

    setSubmitting(true);
    try {
      const response = await apiFetch('/auth/google/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, marketingOptIn }),
        redirectOnUnauthorized: false,
      });
      if (response.status === 200) {
        const body = (await response.json()) as { next: string };
        // O botão segue desabilitado até a navegação terminar.
        router.replace(safeNext(body.next));
        router.refresh();
        return;
      }
      if (response.status === 401 || response.status === 409) {
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
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Complete seu cadastro</h1>
        <p className="text-body text-muted-foreground">
          Você está entrando com {googleEmail}.
        </p>
      </div>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="google-signup-name">Nome</Label>
          <Input
            id="google-signup-name"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={
              errors.name ? 'google-signup-name-error' : undefined
            }
          />
          <FieldError id="google-signup-name-error" message={errors.name} />
        </div>

        <TermsConsent
          errorId="google-signup-terms-error"
          acceptTerms={values.acceptTerms}
          onAcceptTermsChange={(checked) => update('acceptTerms', checked)}
          termsError={errors.acceptTerms}
          marketingOptIn={marketingOptIn}
          onMarketingOptInChange={setMarketingOptIn}
        />

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
    </section>
  );
}
