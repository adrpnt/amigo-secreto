'use client';

import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';

const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';

// "Reenviar e-mail" de confirmação: invalida o link anterior e manda outro.
export function ResendVerification({
  variant = 'default',
}: {
  variant?: 'default' | 'outline';
}) {
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setSending(true);
    setError(null);
    try {
      const response = await apiFetch('/auth/email/verification-link', {
        method: 'POST',
      });
      if (response.status === 202) {
        setSentTo(((await response.json()) as { email: string }).email);
      } else if (response.status === 409 || response.status === 429) {
        setError(((await response.json()) as { message: string }).message);
      } else {
        setError(GENERIC_ERROR);
      }
    } catch {
      setError(GENERIC_ERROR);
    }
    setSending(false);
  }

  if (sentTo) {
    return <p role="status">Enviamos um novo link para {sentTo}.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        variant={variant}
        disabled={sending}
        onClick={() => void resend()}
      >
        Reenviar e-mail
      </Button>
    </div>
  );
}
