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

// Mesmas regras do cadastro, com as mensagens do site.
function validateName(value: string): string | undefined {
  const name = value.trim();
  if (name.length === 0) return 'Informe seu nome.';
  if ([...name].length > 80) return 'Use até 80 caracteres.';
  return undefined;
}

export function ProfileNameForm({ name: savedName }: { name: string }) {
  const router = useRouter();
  const [name, setName] = useState(savedName);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Antes do primeiro envio o campo não aparece com erro.
  const nameError = submitted ? validateName(name) : undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSaved(false);
    setFormError(null);
    if (validateName(name)) return;

    setSubmitting(true);
    try {
      const response = await apiFetch('/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (response.status === 200) {
        const user = (await response.json()) as { name: string };
        setName(user.name);
        setSubmitted(false);
        setSaved(true);
        // O topo do perfil e o menu do avatar leem o nome no servidor.
        router.refresh();
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
      <h2 className="text-h3">Nome</h2>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-name">Nome</Label>
          <Input
            id="profile-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'profile-name-error' : undefined}
          />
          <FieldError id="profile-name-error" message={nameError} />
        </div>

        {formError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Salvar nome'}
          </Button>
          <p role="status" className="text-body-sm text-muted-foreground">
            {saved && 'Nome salvo.'}
          </p>
        </div>
      </form>
    </section>
  );
}
