import type { MemberItem, MembersPage } from '@amigo-secreto/shared';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/lib/api-fetch';
import { ParticipantsList } from './participants-list';

vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';
const LOAD_ERROR = 'Não foi possível carregar os participantes. Tente de novo.';

function member(name: string, overrides: Partial<MemberItem> = {}): MemberItem {
  return {
    membershipId: crypto.randomUUID(),
    name,
    avatarUrl: null,
    status: 'APPROVED',
    isOrganizer: false,
    ...overrides,
  };
}

function page(
  items: MemberItem[],
  nextCursor: string | null = null,
  approvedCount = items.length,
): MembersPage {
  return { items, nextCursor, approvedCount };
}

function jsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function renderList(initialPage: MembersPage) {
  return render(
    <ParticipantsList
      groupId={GROUP_ID}
      initialPage={initialPage}
      canManage={false}
      groupStatus="OPEN"
      reloadKey={0}
      onApprove={vi.fn()}
      onReject={vi.fn()}
      onRemove={vi.fn()}
      onTransfer={vi.fn()}
    />,
  );
}

function shownNames(): string[] {
  return within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('p')?.textContent ?? '');
}

function searchField(): HTMLElement {
  return screen.getByRole('searchbox', { name: 'Buscar participante' });
}

// Digita no campo de busca e avança o relógio falso. O userEvent não anda com
// os timers falsos do Vitest, por isso o fireEvent.
async function typeWithClock(value: string, ms: number) {
  fireEvent.change(searchField(), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
});

function startFakeClock() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ParticipantsList', () => {
  it('mostra o total de participantes aprovados', () => {
    const { unmount } = renderList(page([member('Ana Souza')], null, 1));
    expect(
      screen.getByRole('heading', { level: 2, name: '1 participante' }),
    ).toBeInTheDocument();
    unmount();

    renderList(page([member('Ana Souza')], 'cursor-1', 25));
    expect(
      screen.getByRole('heading', { level: 2, name: '25 participantes' }),
    ).toBeInTheDocument();
  });

  it('Carregar mais acrescenta a página seguinte ao fim e some sem cursor', async () => {
    const user = userEvent.setup();
    const next = deferred<Response>();
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(jsonResponse(500, {}))
      .mockReturnValueOnce(next.promise);
    renderList(page([member('Ana Souza'), member('Bruno Lima')], 'cursor-1'));

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_ERROR);
    expect(shownNames()).toEqual(['Ana Souza', 'Bruno Lima']);

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(screen.getByRole('button', { name: 'Carregando…' })).toBeDisabled();
    expect(apiFetch).toHaveBeenLastCalledWith(
      `/groups/${GROUP_ID}/members?cursor=cursor-1`,
      expect.anything(),
    );

    await act(async () => {
      next.resolve(jsonResponse(200, page([member('Carla Dias')], null, 3)));
      await next.promise;
    });

    expect(shownNames()).toEqual(['Ana Souza', 'Bruno Lima', 'Carla Dias']);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /Carregar mais/ })).toBeNull();
  });

  it('busca na API depois de 300 ms com o termo', async () => {
    startFakeClock();
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(200, page([member('João Pereira')], null, 2)),
    );
    renderList(page([member('Ana Souza'), member('João Pereira')]));

    // Uma tecla a cada 100 ms: a espera conta a partir da última.
    for (const value of ['j', 'jo', 'joa', 'joao']) {
      await typeWithClock(value, 100);
    }
    expect(apiFetch).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(199);
    });
    expect(apiFetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(
      `/groups/${GROUP_ID}/members?search=joao`,
      expect.anything(),
    );
    expect(shownNames()).toEqual(['João Pereira']);
  });

  it('mostra Ninguém encontrado com esse nome.', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse(200, page([], null, 2)));
    renderList(page([member('Ana Souza'), member('Bruno Lima')]));

    await user.type(searchField(), 'zé');

    expect(
      await screen.findByText('Ninguém encontrado com esse nome.'),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('descarta a resposta de uma busca antiga', async () => {
    startFakeClock();
    const old = deferred<Response>();
    vi.mocked(apiFetch)
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(
        jsonResponse(200, page([member('Ana Souza')], null, 3)),
      );
    renderList(
      page([member('Ana Souza'), member('André Lima'), member('Bruno Dias')]),
    );

    await typeWithClock('an', 300);
    await typeWithClock('ana s', 300);
    expect(shownNames()).toEqual(['Ana Souza']);

    await act(async () => {
      old.resolve(
        jsonResponse(
          200,
          page([member('Ana Souza'), member('André Lima')], null, 3),
        ),
      );
      await old.promise;
    });

    expect(shownNames()).toEqual(['Ana Souza']);
    const firstInit = vi.mocked(apiFetch).mock.calls[0][1];
    expect(firstInit?.signal?.aborted).toBe(true);
  });

  it('mostra a lista na ordem devolvida pela API sem reordenar', () => {
    renderList(
      page([
        member('Zé Pendente', { status: 'PENDING' }),
        member('Ana Souza', { isOrganizer: true }),
        member('Bruno Lima'),
        member('Abel Recusado', { status: 'REJECTED' }),
      ]),
    );

    expect(shownNames()).toEqual([
      'Zé Pendente',
      'Ana Souza',
      'Bruno Lima',
      'Abel Recusado',
    ]);
  });
});
