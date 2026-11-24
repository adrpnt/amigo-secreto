import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/lib/api-fetch';
import { JoinButton } from './join-button';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const CODE = 'abc234defg';
const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';
const GENERIC_ERROR = 'Não foi possível entrar no grupo. Tente de novo.';

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

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  push.mockReset();
  refresh.mockReset();
});

describe('JoinButton', () => {
  it('mostra Entrar no grupo sem aprovação', () => {
    render(<JoinButton code={CODE} requiresApproval={false} />);

    expect(
      screen.getByRole('button', { name: 'Entrar no grupo' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Quem organiza precisa aprovar sua entrada.'),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Pedir para entrar' }),
    ).toBeNull();
  });

  it('mostra o texto da aprovação e Pedir para entrar com aprovação', () => {
    render(<JoinButton code={CODE} requiresApproval />);

    expect(
      screen.getByText('Quem organiza precisa aprovar sua entrada.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pedir para entrar' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Entrar no grupo' }),
    ).toBeNull();
  });

  it('entrar leva a /grupos/{id}', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(200, { status: 'APPROVED', groupId: GROUP_ID }),
    );
    render(<JoinButton code={CODE} requiresApproval={false} />);

    await user.click(screen.getByRole('button', { name: 'Entrar no grupo' }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/grupos/${GROUP_ID}`),
    );
    expect(apiFetch).toHaveBeenCalledWith(`/invites/${CODE}/join`, {
      method: 'POST',
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('pedir para entrar atualiza a página', async () => {
    const user = userEvent.setup();
    for (const status of ['PENDING', 'REJECTED']) {
      refresh.mockReset();
      vi.mocked(apiFetch).mockResolvedValue(
        jsonResponse(200, { status, groupId: null }),
      );
      const { unmount } = render(<JoinButton code={CODE} requiresApproval />);

      await user.click(
        screen.getByRole('button', { name: 'Pedir para entrar' }),
      );

      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(push).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('desabilita o botão e mostra Entrando… durante o pedido', async () => {
    const user = userEvent.setup();
    const response = deferred<Response>();
    vi.mocked(apiFetch).mockReturnValue(response.promise);
    render(<JoinButton code={CODE} requiresApproval={false} />);

    await user.click(screen.getByRole('button', { name: 'Entrar no grupo' }));

    const waiting = screen.getByRole('button', { name: 'Entrando…' });
    expect(waiting).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Entrar no grupo' }),
    ).toBeNull();

    response.resolve(
      jsonResponse(200, { status: 'APPROVED', groupId: GROUP_ID }),
    );
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it('mostra Não foi possível entrar no grupo. Tente de novo. e mantém o botão num erro inesperado', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValueOnce(
      jsonResponse(500, { statusCode: 500, message: 'Erro interno' }),
    );
    render(<JoinButton code={CODE} requiresApproval={false} />);

    await user.click(screen.getByRole('button', { name: 'Entrar no grupo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_ERROR);
    expect(
      screen.getByRole('button', { name: 'Entrar no grupo' }),
    ).toBeEnabled();

    vi.mocked(apiFetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await user.click(screen.getByRole('button', { name: 'Entrar no grupo' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Entrar no grupo' }),
      ).toBeEnabled(),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(GENERIC_ERROR);
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('mostra a mensagem da API num 409 ou 429', async () => {
    const user = userEvent.setup();
    const cases = [
      jsonResponse(409, {
        statusCode: 409,
        message: 'Este grupo já fez o sorteio e não aceita novas entradas.',
      }),
      jsonResponse(429, {
        statusCode: 429,
        message: 'Muitas tentativas. Tente de novo em 12 minutos.',
      }),
    ];
    render(<JoinButton code={CODE} requiresApproval={false} />);

    for (const response of cases) {
      const { message } = (await response.clone().json()) as {
        message: string;
      };
      vi.mocked(apiFetch).mockResolvedValueOnce(response);
      await user.click(screen.getByRole('button', { name: 'Entrar no grupo' }));

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(message),
      );
      expect(
        screen.getByRole('button', { name: 'Entrar no grupo' }),
      ).toBeEnabled();
    }
    expect(push).not.toHaveBeenCalled();
  });

  it('atualiza a página quando o convite deixou de valer', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(404, {
        statusCode: 404,
        message: 'Convite não encontrado.',
      }),
    );
    render(<JoinButton code={CODE} requiresApproval={false} />);

    await user.click(screen.getByRole('button', { name: 'Entrar no grupo' }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
