import type { MemberItem, MembersPage } from '@amigo-secreto/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/lib/api-fetch';
import { MemberActions } from './member-actions';

vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';
const MEMBERS_PATH = `/groups/${GROUP_ID}/members`;

const ANA: MemberItem = {
  membershipId: '0b8f4c1e-2d3a-4e5f-8a9b-1c2d3e4f5a6b',
  name: 'Ana Souza',
  avatarUrl: null,
  status: 'APPROVED',
  isOrganizer: true,
};

const BRUNO: MemberItem = {
  membershipId: '7c6d5e4f-3a2b-4c1d-9e8f-7a6b5c4d3e2f',
  name: 'Bruno Lima',
  avatarUrl: null,
  status: 'APPROVED',
  isOrganizer: false,
};

function page(items: MemberItem[]): MembersPage {
  return {
    items,
    nextCursor: null,
    approvedCount: items.filter((item) => item.status === 'APPROVED').length,
  };
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

// Responde às rotas pelo caminho; a lista recarregada devolve `reloaded`.
function mockApi(
  routes: Record<string, () => Response | Promise<Response>>,
  reloaded: MembersPage,
) {
  vi.mocked(apiFetch).mockImplementation((path, init) => {
    if (path === MEMBERS_PATH && !init?.method) {
      return Promise.resolve(jsonResponse(200, reloaded));
    }
    const route = routes[`${init?.method ?? 'GET'} ${path}`];
    if (!route) throw new Error(`Chamada inesperada: ${path}`);
    return Promise.resolve(route());
  });
}

function renderActions(initialPage: MembersPage) {
  render(
    <MemberActions
      groupId={GROUP_ID}
      initialPage={initialPage}
      canManage
      groupStatus="OPEN"
    />,
  );
}

function rowNames(): string[] {
  return within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('p')?.textContent ?? '');
}

function reloadCalls() {
  return vi
    .mocked(apiFetch)
    .mock.calls.filter(
      ([path, init]) => path === MEMBERS_PATH && !init?.method,
    );
}

async function openMenuItem(
  user: ReturnType<typeof userEvent.setup>,
  item: string,
) {
  await user.click(
    screen.getByRole('button', { name: 'Ações para Bruno Lima' }),
  );
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  refresh.mockReset();
});

describe('MemberActions', () => {
  it('Aprovar chama a API e recarrega a lista', async () => {
    const user = userEvent.setup();
    mockApi(
      {
        [`POST ${MEMBERS_PATH}/${BRUNO.membershipId}/approve`]: () =>
          jsonResponse(200, BRUNO),
      },
      page([ANA, BRUNO]),
    );
    renderActions(page([{ ...BRUNO, status: 'PENDING' }, ANA]));

    await user.click(
      screen.getByRole('button', { name: 'Aprovar Bruno Lima' }),
    );

    expect(apiFetch).toHaveBeenCalledWith(
      `${MEMBERS_PATH}/${BRUNO.membershipId}/approve`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ from: 'PENDING' }),
      }),
    );
    await waitFor(() =>
      expect(rowNames()).toEqual(['Ana Souza', 'Bruno Lima']),
    );
    expect(screen.queryByText('Pendente')).toBeNull();
    expect(
      screen.getByRole('heading', { name: '2 participantes' }),
    ).toBeVisible();
  });

  it('Recusar chama a API sem confirmação e recarrega a lista', async () => {
    const user = userEvent.setup();
    const rejected = { ...BRUNO, status: 'REJECTED' as const };
    mockApi(
      {
        [`POST ${MEMBERS_PATH}/${BRUNO.membershipId}/reject`]: () =>
          jsonResponse(200, rejected),
      },
      page([ANA, rejected]),
    );
    renderActions(page([{ ...BRUNO, status: 'PENDING' }, ANA]));

    await user.click(
      screen.getByRole('button', { name: 'Recusar Bruno Lima' }),
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith(
      `${MEMBERS_PATH}/${BRUNO.membershipId}/reject`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ from: 'PENDING' }),
      }),
    );
    expect(await screen.findByText('Recusado')).toBeInTheDocument();
    expect(rowNames()).toEqual(['Ana Souza', 'Bruno Lima']);
  });

  it('Remover do grupo confirma com os textos da spec e foco em Manter no grupo', async () => {
    const user = userEvent.setup();
    renderActions(page([ANA, BRUNO]));

    await openMenuItem(user, 'Remover do grupo');

    const dialog = await screen.findByRole('dialog', {
      name: 'Remover Bruno Lima do grupo?',
    });
    expect(dialog).toHaveAccessibleDescription(
      'Bruno Lima sai do grupo e só volta se você aprovar.',
    );
    const keep = within(dialog).getByRole('button', {
      name: 'Manter no grupo',
    });
    expect(
      within(dialog).getByRole('button', { name: 'Remover do grupo' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(keep).toHaveFocus());
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('Manter no grupo, Esc e toque fora fecham sem remover', async () => {
    const user = userEvent.setup();
    renderActions(page([ANA, BRUNO]));
    const title = 'Remover Bruno Lima do grupo?';

    await openMenuItem(user, 'Remover do grupo');
    await screen.findByRole('dialog', { name: title });
    await user.click(screen.getByRole('button', { name: 'Manter no grupo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await openMenuItem(user, 'Remover do grupo');
    await screen.findByRole('dialog', { name: title });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await openMenuItem(user, 'Remover do grupo');
    await screen.findByRole('dialog', { name: title });
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();
    await user.click(overlay as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    expect(apiFetch).not.toHaveBeenCalled();
    expect(rowNames()).toEqual(['Ana Souza', 'Bruno Lima']);
  });

  it('confirmar a remoção chama a API e recarrega a lista', async () => {
    const user = userEvent.setup();
    const removal = deferred<Response>();
    mockApi(
      {
        [`DELETE ${MEMBERS_PATH}/${BRUNO.membershipId}`]: () => removal.promise,
      },
      page([ANA]),
    );
    renderActions(page([ANA, BRUNO]));

    await openMenuItem(user, 'Remover do grupo');
    const dialog = await screen.findByRole('dialog', {
      name: 'Remover Bruno Lima do grupo?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Remover do grupo' }),
    );
    expect(
      within(dialog).getByRole('button', { name: 'Removendo…' }),
    ).toBeDisabled();

    removal.resolve(new Response(null, { status: 204 }));

    await waitFor(() => expect(rowNames()).toEqual(['Ana Souza']));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getByRole('heading', { name: '1 participante' }),
    ).toBeVisible();
  });

  it('Transferir organização confirma com os textos da spec e foco em Manter organização', async () => {
    const user = userEvent.setup();
    renderActions(page([ANA, BRUNO]));

    await openMenuItem(user, 'Transferir organização');

    const dialog = await screen.findByRole('dialog', {
      name: 'Passar a organização para Bruno Lima?',
    });
    expect(dialog).toHaveAccessibleDescription(
      'Bruno Lima passa a cuidar do grupo, dos convites e do sorteio. Você continua no grupo como participante.',
    );
    const keep = within(dialog).getByRole('button', {
      name: 'Manter organização',
    });
    expect(
      within(dialog).getByRole('button', { name: 'Transferir organização' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(keep).toHaveFocus());
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('confirmar a transferência chama a API e recarrega a página', async () => {
    const user = userEvent.setup();
    const transfer = deferred<Response>();
    mockApi(
      { [`POST /groups/${GROUP_ID}/transfer`]: () => transfer.promise },
      page([ANA, BRUNO]),
    );
    renderActions(page([ANA, BRUNO]));

    await openMenuItem(user, 'Transferir organização');
    const dialog = await screen.findByRole('dialog', {
      name: 'Passar a organização para Bruno Lima?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Transferir organização' }),
    );
    expect(
      within(dialog).getByRole('button', { name: 'Transferindo…' }),
    ).toBeDisabled();
    expect(apiFetch).toHaveBeenCalledWith(
      `/groups/${GROUP_ID}/transfer`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ membershipId: BRUNO.membershipId }),
      }),
    );

    transfer.resolve(jsonResponse(200, { id: GROUP_ID }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('mostra a mensagem da API num 403, 404 ou 409', async () => {
    const user = userEvent.setup();
    const drawn = 'Com o sorteio feito, ninguém entra nem sai do grupo.';
    const notOrganizer = 'Só quem organiza pode alterar o grupo.';
    const notFound = 'Participante não encontrado.';
    mockApi(
      {
        [`POST ${MEMBERS_PATH}/${BRUNO.membershipId}/approve`]: () =>
          jsonResponse(409, { message: drawn }),
        [`POST ${MEMBERS_PATH}/${BRUNO.membershipId}/reject`]: () =>
          jsonResponse(403, { message: notOrganizer }),
        [`POST ${MEMBERS_PATH}/${ANA.membershipId}/approve`]: () =>
          jsonResponse(404, { message: notFound }),
      },
      page([ANA, { ...BRUNO, status: 'PENDING' }]),
    );
    renderActions(
      page([
        { ...BRUNO, status: 'PENDING' },
        { ...ANA, isOrganizer: false, status: 'REJECTED' },
      ]),
    );

    await user.click(
      screen.getByRole('button', { name: 'Aprovar Bruno Lima' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(drawn);
    expect(reloadCalls()).toHaveLength(0);

    await user.click(
      screen.getByRole('button', { name: 'Recusar Bruno Lima' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(notOrganizer),
    );
    expect(reloadCalls()).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Aprovar Ana Souza' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(notFound),
    );
    await waitFor(() => expect(reloadCalls()).toHaveLength(1));
    await waitFor(() =>
      expect(rowNames()).toEqual(['Ana Souza', 'Bruno Lima']),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(notFound);
  });
});
