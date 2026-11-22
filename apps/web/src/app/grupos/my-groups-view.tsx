'use client';

import type { GroupSummary, MyGroupsResponse } from '@amigo-secreto/shared';
import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GroupCard } from '@/components/group-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CREATE_LINK_CLASS = cn(buttonVariants(), 'w-full sm:w-auto');

function CreateGroupLink() {
  return (
    <Link href="/grupos/novo" className={CREATE_LINK_CLASS}>
      Criar grupo
    </Link>
  );
}

function GroupSection({
  id,
  title,
  groups,
  emptyText,
}: {
  id: string;
  title: string;
  groups: GroupSummary[];
  emptyText?: string;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      {groups.length === 0 ? (
        <p className="text-body text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id} className="flex">
              <GroupCard group={group} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Conteúdo de "Meus grupos". `groups` nulo é a falha da API ao carregar a
// lista; a ordem e a separação das seções vêm prontas da API.
export function MyGroupsView({ groups }: { groups: MyGroupsResponse | null }) {
  const router = useRouter();
  const isEmpty =
    groups !== null && groups.active.length === 0 && groups.closed.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h1">Meus grupos</h1>
        {!isEmpty && <CreateGroupLink />}
      </div>

      {groups === null ? (
        <div className="flex flex-col items-start gap-4">
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>
              Não foi possível carregar seus grupos.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => router.refresh()}>
            Tentar de novo
          </Button>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-muted-foreground">
            Você ainda não participa de nenhum grupo.
          </p>
          <CreateGroupLink />
        </div>
      ) : (
        <>
          <GroupSection
            id="grupos-ativos"
            title="Ativos"
            groups={groups.active}
            emptyText="Nenhum grupo ativo."
          />
          {groups.closed.length > 0 && (
            <GroupSection
              id="grupos-encerrados"
              title="Encerrados"
              groups={groups.closed}
            />
          )}
        </>
      )}
    </main>
  );
}
