'use client';

import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';

const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';

// A caixa grava a cada clique; em falha volta ao estado anterior.
export function MarketingPreference({
  marketingOptIn: savedOptIn,
}: {
  marketingOptIn: boolean;
}) {
  const [marketingOptIn, setMarketingOptIn] = useState(savedOptIn);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function change(checked: boolean) {
    const previous = marketingOptIn;
    setMarketingOptIn(checked);
    setSaved(false);
    setFormError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch('/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketingOptIn: checked }),
      });
      if (response.status === 200) {
        setSaved(true);
      } else {
        setMarketingOptIn(previous);
        setFormError(GENERIC_ERROR);
      }
    } catch {
      setMarketingOptIn(previous);
      setFormError(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="marketing-title" className="flex flex-col gap-4">
      <h2 id="marketing-title" className="text-h3">
        Novidades por e-mail
      </h2>
      <Label className="items-start font-normal text-body-sm">
        <Checkbox
          className="mt-0.5"
          checked={marketingOptIn}
          disabled={submitting}
          onCheckedChange={(checked) => void change(checked)}
        />
        <span>Quero receber novidades do Amigo Secreto por e-mail.</span>
      </Label>
      {formError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <p role="status" className="text-body-sm text-muted-foreground">
        {saved && 'Preferência salva.'}
      </p>
    </section>
  );
}
