import type { InviteView as Invite } from '@amigo-secreto/shared';
import { CircleAlert, Clock, Info, UserRound } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import type { InviteTooMany } from '@/lib/invites';
import { cn } from '@/lib/utils';
import { JoinButton } from './join-button';

const STATUS_NOTICE = {
  DRAWN: 'Este grupo já fez o sorteio e não aceita novas entradas.',
  CLOSED: 'Este grupo foi encerrado e não aceita novas entradas.',
} as const;

function Notice({
  variant = 'info',
  children,
}: {
  variant?: 'info' | 'warning';
  children: ReactNode;
}) {
  const Icon = variant === 'warning' ? Clock : Info;
  return (
    <Alert variant={variant}>
      <Icon aria-hidden />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

// O que a pessoa pode fazer com o convite. Grupo fora de ABERTO mostra o aviso
// do status a todos; o resto depende da participação de quem abriu.
function InviteAction({ code, invite }: { code: string; invite: Invite }) {
  if (invite.groupStatus !== 'OPEN') {
    return <Notice>{STATUS_NOTICE[invite.groupStatus]}</Notice>;
  }

  switch (invite.viewer) {
    case 'anonymous': {
      const next = encodeURIComponent(`/convite/${code}`);
      return (
        <div className="flex flex-col gap-4">
          <p className="text-body">
            Para entrar no grupo, entre na sua conta ou crie uma.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/entrar?next=${next}`}
              className={cn(buttonVariants(), 'w-full')}
            >
              Entrar
            </Link>
            <Link
              href={`/cadastro?next=${next}`}
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
            >
              Criar conta
            </Link>
          </div>
        </div>
      );
    }
    case 'none':
      return (
        <JoinButton code={code} requiresApproval={invite.requiresApproval} />
      );
    case 'pending':
      return (
        <Notice variant="warning">
          Seu pedido está aguardando a aprovação de {invite.organizerName}.
        </Notice>
      );
    case 'rejected':
      return <Notice>Sua entrada neste grupo não foi aprovada.</Notice>;
    case 'member':
      // A página leva o participante aprovado para o grupo antes daqui.
      return null;
  }
}

// Página do convite: do grupo, só o nome e quem organiza.
export function InviteView({
  code,
  invite,
}: {
  code: string;
  invite: Invite | InviteTooMany;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-8">
      {'tooMany' in invite ? (
        <>
          <h1 className="text-h1">Convite</h1>
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{invite.tooMany}</AlertDescription>
          </Alert>
        </>
      ) : (
        <div className="flex w-full flex-col gap-6 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm md:p-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-h1 break-words">{invite.groupName}</h1>
            <p className="flex items-center gap-2 text-body text-muted-foreground">
              <UserRound aria-hidden="true" className="size-5 shrink-0" />
              Organizado por {invite.organizerName}
            </p>
          </div>
          <InviteAction code={code} invite={invite} />
        </div>
      )}
    </main>
  );
}
