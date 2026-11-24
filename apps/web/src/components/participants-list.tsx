'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  GroupStatus,
  MemberItem,
  MembersPage,
} from '@amigo-secreto/shared';
import { CircleAlert, Search } from 'lucide-react';
import { ParticipantRow } from '@/components/participant-row';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';
import { participantsLabel } from '@/lib/group-format';

const SEARCH_DELAY_MS = 300;
const LOAD_ERROR = 'Não foi possível carregar os participantes. Tente de novo.';

type MemberAction = (member: MemberItem) => void;

// Lista da aba Participantes. Ordem, busca e contagem vêm da API; aqui só se
// acrescenta ao fim o que "Carregar mais" trouxe. Quando `reloadKey` muda, a
// lista busca de novo a primeira página com o termo atual.
export function ParticipantsList({
  groupId,
  initialPage,
  canManage,
  groupStatus,
  reloadKey,
  onApprove,
  onReject,
  onRemove,
  onTransfer,
}: {
  groupId: string;
  initialPage: MembersPage;
  canManage: boolean;
  groupStatus: GroupStatus;
  reloadKey: number;
  onApprove: MemberAction;
  onReject: MemberAction;
  onRemove: MemberAction;
  onTransfer: MemberAction;
}) {
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [approvedCount, setApprovedCount] = useState(initialPage.approvedCount);
  const [search, setSearch] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const searchRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requestRef = useRef<AbortController>(undefined);
  const lastReloadKey = useRef(reloadKey);

  // Só a chamada mais recente vale: cada uma cancela a anterior.
  const load = useCallback(
    async (term: string, cursor: string | null) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;

      const params = new URLSearchParams();
      if (term.trim()) params.set('search', term.trim());
      if (cursor) params.set('cursor', cursor);
      const query = params.size > 0 ? `?${params.toString()}` : '';

      try {
        const response = await apiFetch(`/groups/${groupId}/members${query}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setFailed(true);
          return;
        }
        const page = (await response.json()) as MembersPage;
        if (controller.signal.aborted) return;
        setItems((current) =>
          cursor ? [...current, ...page.items] : page.items,
        );
        setNextCursor(page.nextCursor);
        setApprovedCount(page.approvedCount);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    },
    [groupId],
  );

  useEffect(() => {
    if (lastReloadKey.current === reloadKey) return;
    lastReloadKey.current = reloadKey;
    void load(searchRef.current, null);
  }, [reloadKey, load]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function changeSearch(value: string) {
    setSearch(value);
    searchRef.current = value;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => void load(value, null),
      SEARCH_DELAY_MS,
    );
  }

  async function loadMore() {
    setLoadingMore(true);
    await load(searchRef.current, nextCursor);
    setLoadingMore(false);
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl leading-7 font-semibold">
        {participantsLabel(approvedCount)}
      </h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="participants-search">Buscar participante</Label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="participants-search"
            type="search"
            className="pl-9"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
          />
        </div>
      </div>

      {failed && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{LOAD_ERROR}</AlertDescription>
        </Alert>
      )}

      {items.length === 0 ? (
        <p className="text-sm leading-5 text-muted-foreground">
          Ninguém encontrado com esse nome.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((member) => (
            <li key={member.membershipId}>
              <ParticipantRow
                member={member}
                canManage={canManage}
                groupStatus={groupStatus}
                onApprove={() => onApprove(member)}
                onReject={() => onReject(member)}
                onRemove={() => onRemove(member)}
                onTransfer={() => onTransfer(member)}
              />
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <Button
          variant="outline"
          className="self-center"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? 'Carregando…' : 'Carregar mais'}
        </Button>
      )}
    </section>
  );
}
