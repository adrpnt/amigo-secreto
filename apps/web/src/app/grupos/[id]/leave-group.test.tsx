import type { GroupStatus } from '@amigo-secreto/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/lib/api-fetch';
import { LeaveGroup } from './leave-group';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';
const TITLE = 'Sair do grupo Família Souza?';
const TEXT =
  'Você deixa de ver o grupo. Para voltar, use o link de convite de novo.';

function renderLeave(status: GroupStatus = 'OPEN', isOrganizer = false) {
  return render(
    <LeaveGroup
      group={{ id: GROUP_ID, name: 'Família Souza', status, isOrganizer }}
    />,
  );
}

function jsonResponse(status: number, body?: object): Response {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Sair do grupo' }));
  return screen.findByRole('dialog', { name: TITLE });
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  push.mockReset();
});

describe('LeaveGroup', () => {
  it('mostra Sair do grupo a quem participa e não organiza com o grupo ABERTO', () => {
    renderLeave('OPEN', false);

    expect(
      screen.getByRole('button', { name: 'Sair do grupo' }),
    ).toBeInTheDocument();
  });

  it('não mostra Sair do grupo a quem organiza nem com o grupo fora de ABERTO', () => {
    const cases: [GroupStatus, boolean][] = [
      ['OPEN', true],
      ['DRAWN', false],
      ['CLOSED', false],
      ['DRAWN', true],
    ];
    for (const [status, isOrganizer] of cases) {
      const { unmount } = renderLeave(status, isOrganizer);
      expect(
        screen.queryByRole('button', { name: 'Sair do grupo' }),
      ).toBeNull();
      unmount();
    }
  });

  it('confirma com os textos da spec e foco em Ficar no grupo', async () => {
    const user = userEvent.setup();
    renderLeave();

    const dialog = await openDialog(user);

    expect(dialog).toHaveAccessibleDescription(TEXT);
    const stay = within(dialog).getByRole('button', { name: 'Ficar no grupo' });
    expect(
      within(dialog).getByRole('button', { name: 'Sair do grupo' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(stay).toHaveFocus());
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('confirmar chama a API e leva a /grupos', async () => {
    const user = userEvent.setup();
    const leave = deferred<Response>();
    vi.mocked(apiFetch).mockReturnValue(leave.promise);
    renderLeave();

    const dialog = await openDialog(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Sair do grupo' }),
    );

    expect(apiFetch).toHaveBeenCalledWith(`/groups/${GROUP_ID}/leave`, {
      method: 'POST',
    });
    expect(
      within(dialog).getByRole('button', { name: 'Saindo…' }),
    ).toBeDisabled();

    leave.resolve(jsonResponse(204));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/grupos'));
  });

  it('mostra a mensagem da API num 409', async () => {
    const user = userEvent.setup();
    const message = 'Com o sorteio feito, ninguém entra nem sai do grupo.';
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse(409, { message }));
    renderLeave();

    const dialog = await openDialog(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Sair do grupo' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(push).not.toHaveBeenCalled();
  });
});
