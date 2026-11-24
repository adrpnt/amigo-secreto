'use client';

import type { GroupDetail, GroupStatus } from '@amigo-secreto/shared';
import { CircleAlert, Copy, Info, Mail, RefreshCw, Share2 } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { whatsappShareUrl } from '@/lib/whatsapp';

const NOTICE_MS = 3_000;
const GENERIC_ERROR = 'Não foi possível concluir. Tente de novo.';
// Respostas cuja mensagem da API aparece como veio.
const API_MESSAGE_STATUSES = [409, 429];

// Com o sorteio feito, o bloco dá lugar ao aviso do status.
const CLOSED_TO_ENTRY: Partial<Record<GroupStatus, string>> = {
  DRAWN: 'Este grupo já fez o sorteio e não aceita novas entradas.',
  CLOSED: 'Este grupo foi encerrado e não aceita novas entradas.',
};

type InviteBlockProps = {
  group: Pick<
    GroupDetail,
    'id' | 'name' | 'status' | 'inviteCode' | 'isOrganizer'
  >;
  siteUrl: string;
  // Formulário de convite por e-mail, mostrado a quem organiza.
  emailInvite?: ReactNode;
};

async function errorMessage(response: Response): Promise<string> {
  if (!API_MESSAGE_STATUSES.includes(response.status)) return GENERIC_ERROR;
  const body = (await response.json().catch(() => ({}))) as {
    message?: unknown;
  };
  return typeof body.message === 'string' ? body.message : GENERIC_ERROR;
}

export function InviteBlock({ group, siteUrl, emailInvite }: InviteBlockProps) {
  const [inviteCode, setInviteCode] = useState(group.inviteCode);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const closedNotice = CLOSED_TO_ENTRY[group.status];
  if (closedNotice) {
    return (
      <Alert variant="info">
        <Info aria-hidden />
        <AlertDescription>{closedNotice}</AlertDescription>
      </Alert>
    );
  }

  const link = `${siteUrl}/convite/${inviteCode}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setNotice('Link copiado');
    } catch {
      linkRef.current?.focus();
      linkRef.current?.select();
    }
  }

  function openConfirm() {
    setError(null);
    setConfirming(true);
  }

  function fail(message: string) {
    setPending(false);
    setConfirming(false);
    setError(message);
  }

  async function regenerate() {
    setPending(true);
    try {
      const response = await apiFetch(`/groups/${group.id}/invite/regenerate`, {
        method: 'POST',
      });
      if (response.status !== 200) {
        fail(await errorMessage(response));
        return;
      }
      const body = (await response.json()) as { inviteCode: string };
      setInviteCode(body.inviteCode);
      setPending(false);
      setConfirming(false);
      setNotice('Novo link gerado');
    } catch {
      fail(GENERIC_ERROR);
    }
  }

  return (
    <section
      aria-labelledby="invite-title"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="invite-title" className="text-h3">
          Convide a turma
        </h2>
        <p className="text-body-sm text-muted-foreground">
          Quem abrir o link vê o nome do grupo e entra com a própria conta.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          ref={linkRef}
          readOnly
          value={link}
          aria-label="Link de convite"
          onFocus={(event) => event.target.select()}
        />
        <Button
          variant="secondary"
          size="icon-lg"
          aria-label="Copiar link"
          onClick={() => void copyLink()}
        >
          <Copy aria-hidden />
        </Button>
      </div>

      <a
        href={whatsappShareUrl(group.name, link)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants(), 'w-full gap-2')}
      >
        <Share2 aria-hidden />
        Compartilhar no WhatsApp
      </a>

      {group.isOrganizer && (
        <>
          <Button
            variant="outline"
            className="w-full gap-2"
            aria-expanded={emailOpen}
            onClick={() => setEmailOpen((open) => !open)}
          >
            <Mail aria-hidden />
            Convidar por e-mail
          </Button>
          {emailOpen && emailInvite}
          <Button
            variant="ghost"
            className="w-full gap-2"
            onClick={openConfirm}
          >
            <RefreshCw aria-hidden />
            Gerar novo link
          </Button>
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ConfirmDialog
        open={confirming}
        title="Gerar um novo link?"
        description="O link atual e os convites por e-mail já enviados deixam de funcionar. Quem já entrou continua no grupo."
        confirmLabel="Gerar novo link"
        cancelLabel="Manter link"
        pendingLabel={pending ? 'Gerando…' : undefined}
        onConfirm={() => void regenerate()}
        onCancel={() => setConfirming(false)}
      />

      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4"
      >
        {notice && (
          <p className="rounded-md bg-foreground px-4 py-2 text-body-sm text-background shadow-md">
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}
