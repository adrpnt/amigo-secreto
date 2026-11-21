'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ResendVerification } from '@/components/resend-verification';
import { buttonVariants } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';
import { safeNext } from '@/lib/safe-next';

export type SessionState = 'signed_out' | 'unverified' | 'verified';
type LinkKind = 'verification' | 'email_change';
type Status = 'confirming' | 'expired' | 'in_use' | 'failed';

const STATUS_TEXT: Record<Status, string> = {
  confirming: 'Confirmando seu e-mail…',
  expired: 'Este link expirou ou já foi usado.',
  in_use: 'Este e-mail já está em uso por outra conta.',
  failed: 'Algo deu errado. Tente de novo.',
};

const CONFIRM_PATH: Record<LinkKind, string> = {
  verification: '/auth/email/verify',
  email_change: '/auth/email/change/confirm',
};

// Caminho seguinte quando o link não confirma nada.
function NextStep({
  kind,
  session,
}: {
  kind: LinkKind;
  session: SessionState;
}) {
  if (session === 'unverified' && kind === 'verification') {
    return <ResendVerification />;
  }
  const [href, label] =
    session === 'signed_out'
      ? ['/entrar', 'Entrar']
      : ['/perfil', 'Ir para o perfil'];
  return (
    <Link href={href} className={buttonVariants()}>
      {label}
    </Link>
  );
}

export function EmailConfirmation({
  token,
  kind,
  session,
}: {
  token?: string;
  kind: LinkKind;
  session: SessionState;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(
    token ? 'confirming' : 'expired',
  );
  // O token vale uma vez: o POST não pode repetir num segundo efeito.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    async function confirm(linkToken: string) {
      try {
        const response = await apiFetch(CONFIRM_PATH[kind], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: linkToken }),
          redirectOnUnauthorized: false,
        });
        if (response.status === 200) {
          const destination =
            kind === 'email_change'
              ? '/perfil'
              : safeNext(((await response.json()) as { next: string }).next);
          router.replace(destination);
          router.refresh();
          return;
        }
        if (response.status === 410) setStatus('expired');
        else if (response.status === 409 && kind === 'email_change') {
          setStatus('in_use');
        } else setStatus('failed');
      } catch {
        setStatus('failed');
      }
    }
    void confirm(token);
  }, [token, kind, router]);

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-h2">{STATUS_TEXT[status]}</h1>
      {status !== 'confirming' && <NextStep kind={kind} session={session} />}
    </section>
  );
}
