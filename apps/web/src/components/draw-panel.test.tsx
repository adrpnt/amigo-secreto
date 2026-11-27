import type { DrawPanel as DrawPanelData } from '@amigo-secreto/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/lib/api-fetch';
import { DrawPanel } from './draw-panel';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const GROUP = {
  id: '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b',
  name: 'Família Souza',
};
const DRAW_TITLE = 'Fazer o sorteio de Família Souza?';
const DRAW_TEXT =
  'Cada pessoa recebe por e-mail quem tirou. Depois do sorteio, ninguém entra nem sai do grupo sem cancelar o sorteio.';
const CANCEL_TITLE = 'Cancelar o sorteio de Família Souza?';
const CANCEL_TEXT =
  'Quem já viu o resultado pode ter guardado o nome. Todos recebem um e-mail avisando que o sorteio foi cancelado, e o grupo volta a aceitar entradas.';
const SECRECY = 'Ninguém vê quem os outros tiraram, nem você.';
const GENERIC_ERROR = 'Não foi possível concluir. Tente de novo.';
// 10/12/2026 às 23:30 no horário de Brasília; já é dia 11 em UTC.
const DRAWN_AT = '2026-12-11T02:30:00.000Z';

const ANA = { membershipId: 'm-ana', name: 'Ana Souza' };
const BRUNO = { membershipId: 'm-bruno', name: 'Bruno Lima' };
const CARLA = { membershipId: 'm-carla', name: 'Carla Dias' };
const DAVI = { membershipId: 'm-davi', name: 'Davi Rocha' };

function panel(overrides: Partial<DrawPanelData> = {}): DrawPanelData {
  return {
    status: 'OPEN',
    drawnAt: null,
    approved: 4,
    pending: 0,
    feasible: true,
    pairsToReview: [],
    ...overrides,
  };
}

const DRAWN = panel({ status: 'DRAWN', drawnAt: DRAWN_AT });

function renderPanel(data: DrawPanelData = panel()) {
  return render(<DrawPanel group={GROUP} panel={data} />);
}

function jsonResponse(status: number, body?: object): Response {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  });
}

function section() {
  return screen.getByRole('region', { name: 'Sorteio' });
}

function conditionItems() {
  return within(section()).getAllByRole('listitem');
}

async function openDraw() {
  await userEvent.click(
    within(section()).getByRole('button', { name: 'Sortear' }),
  );
  return screen.findByRole('dialog', { name: DRAW_TITLE });
}

async function openCancel() {
  await userEvent.click(
    within(section()).getByRole('button', { name: 'Cancelar sorteio' }),
  );
  return screen.findByRole('dialog', { name: CANCEL_TITLE });
}

async function expectDialogClosed() {
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  refresh.mockReset();
});

describe('DrawPanel', () => {
  it('mostra o título, as três condições, Sortear e a frase de sigilo', () => {
    renderPanel(panel({ approved: 4, pending: 0, feasible: true }));

    expect(
      within(section()).getByRole('heading', { level: 2, name: 'Sorteio' }),
    ).toBeInTheDocument();
    expect(conditionItems().map((item) => item.textContent)).toEqual([
      '4 participantes aprovados',
      'Nenhuma entrada pendente',
      'As restrições permitem o sorteio',
    ]);
    const draw = within(section()).getByRole('button', { name: 'Sortear' });
    expect(draw).toBeEnabled();
    expect(within(section()).getByText(SECRECY)).toBeInTheDocument();
  });

  it('mostra condição cumprida com ícone em success e pendente com ícone em warning', () => {
    renderPanel(panel({ approved: 4, pending: 2, feasible: true }));

    const [approved, pending] = conditionItems();
    const metIcon = approved.querySelector('svg');
    const pendingIcon = pending.querySelector('svg');
    expect(metIcon).toHaveClass('text-success');
    expect(metIcon).not.toHaveClass('text-warning');
    expect(pendingIcon).toHaveClass('text-warning');
    expect(pendingIcon).not.toHaveClass('text-success');
    expect(pending).toHaveTextContent('2 pessoas aguardam aprovação');
  });

  it('desabilita Sortear com alguma condição pendente', () => {
    const pendingCases = [
      panel({ approved: 2 }),
      panel({ pending: 1 }),
      panel({ feasible: false }),
    ];

    for (const data of pendingCases) {
      const { unmount } = renderPanel(data);
      expect(
        within(section()).getByRole('button', { name: 'Sortear' }),
      ).toBeDisabled();
      unmount();
    }
  });

  it('mostra o alerta Revise estes pares com os pares a revisar', () => {
    renderPanel(
      panel({
        feasible: false,
        pairsToReview: [
          { id: 'p1', a: ANA, b: BRUNO },
          { id: 'p2', a: CARLA, b: DAVI },
        ],
      }),
    );

    expect(within(section()).getByRole('alert')).toHaveTextContent(
      'Revise estes pares: Ana Souza e Bruno Lima; Carla Dias e Davi Rocha.',
    );
  });

  it('Sortear abre a confirmação com o texto e os botões', async () => {
    renderPanel();

    const dialog = await openDraw();

    expect(dialog).toHaveAccessibleDescription(DRAW_TEXT);
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Sortear', 'Ainda não']);
  });

  it('Ainda não, Esc e clique fora fecham sem sortear', async () => {
    const user = userEvent.setup();
    renderPanel();

    const first = await openDraw();
    await user.click(within(first).getByRole('button', { name: 'Ainda não' }));
    await expectDialogClosed();

    await openDraw();
    await user.keyboard('{Escape}');
    await expectDialogClosed();

    await openDraw();
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();
    await user.click(overlay as HTMLElement);
    await expectDialogClosed();

    expect(apiFetch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('confirmar mostra Sorteando… e atualiza a página no sucesso', async () => {
    let answer: (response: Response) => void = () => {};
    vi.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    renderPanel();

    const dialog = await openDraw();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Sortear' }),
    );

    expect(
      await within(dialog).findByRole('button', { name: 'Sorteando…' }),
    ).toBeDisabled();
    expect(apiFetch).toHaveBeenCalledWith(`/groups/${GROUP.id}/draw`, {
      method: 'POST',
    });
    expect(refresh).not.toHaveBeenCalled();

    answer(jsonResponse(201, { drawnAt: DRAWN_AT }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await expectDialogClosed();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra a mensagem da API no 409 e no 429 e fecha a confirmação', async () => {
    const answers = [
      jsonResponse(409, {
        statusCode: 409,
        message: 'Aprove ou recuse os pedidos pendentes antes do sorteio.',
      }),
      jsonResponse(429, {
        statusCode: 429,
        message: 'Muitas tentativas. Tente de novo em 30 minutos.',
      }),
    ];

    for (const response of answers) {
      vi.mocked(apiFetch).mockResolvedValueOnce(response);
      const { unmount } = renderPanel();
      const dialog = await openDraw();
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Sortear' }),
      );

      await expectDialogClosed();
      const message =
        response.status === 409
          ? 'Aprove ou recuse os pedidos pendentes antes do sorteio.'
          : 'Muitas tentativas. Tente de novo em 30 minutos.';
      expect(await within(section()).findByRole('alert')).toHaveTextContent(
        message,
      );
      expect(refresh).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('mostra Não foi possível concluir. Tente de novo. em outro erro', async () => {
    const failures: (() => Promise<Response>)[] = [
      () =>
        Promise.resolve(
          jsonResponse(403, {
            statusCode: 403,
            message: 'Só quem organiza pode alterar o grupo.',
          }),
        ),
      () => Promise.resolve(jsonResponse(500, { statusCode: 500 })),
      () => Promise.reject(new TypeError('Failed to fetch')),
    ];

    for (const failure of failures) {
      vi.mocked(apiFetch).mockImplementationOnce(failure);
      const { unmount } = renderPanel();
      const dialog = await openDraw();
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Sortear' }),
      );

      await expectDialogClosed();
      expect(await within(section()).findByRole('alert')).toHaveTextContent(
        GENERIC_ERROR,
      );
      unmount();
    }
  });

  it('depois do sorteio mostra Sorteio feito em, o texto e Cancelar sorteio', () => {
    renderPanel(DRAWN);

    expect(
      within(section()).getByRole('heading', { level: 2, name: 'Sorteio' }),
    ).toBeInTheDocument();
    expect(
      within(section()).getByText('Sorteio feito em 10/12/2026'),
    ).toBeInTheDocument();
    expect(
      within(section()).getByText(
        'Cada pessoa já pode ver quem tirou, aqui e por e-mail.',
      ),
    ).toBeInTheDocument();
    expect(
      within(section())
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Cancelar sorteio']);
    expect(within(section()).queryByRole('listitem')).toBeNull();
  });

  it('com o grupo ENCERRADO mostra Sorteio feito em sem Cancelar sorteio', () => {
    renderPanel(panel({ status: 'CLOSED', drawnAt: DRAWN_AT }));

    expect(
      within(section()).getByText('Sorteio feito em 10/12/2026'),
    ).toBeInTheDocument();
    expect(within(section()).queryAllByRole('button')).toEqual([]);
    expect(
      within(section()).queryByText(
        'Cada pessoa já pode ver quem tirou, aqui e por e-mail.',
      ),
    ).toBeNull();
  });

  it('Cancelar sorteio abre a confirmação com o texto e os botões', async () => {
    renderPanel(DRAWN);

    const dialog = await openCancel();

    expect(dialog).toHaveAccessibleDescription(CANCEL_TEXT);
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Cancelar sorteio', 'Manter sorteio']);
  });

  it('Manter sorteio, Esc e clique fora fecham sem cancelar', async () => {
    const user = userEvent.setup();
    renderPanel(DRAWN);

    const first = await openCancel();
    await user.click(
      within(first).getByRole('button', { name: 'Manter sorteio' }),
    );
    await expectDialogClosed();

    await openCancel();
    await user.keyboard('{Escape}');
    await expectDialogClosed();

    await openCancel();
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();
    await user.click(overlay as HTMLElement);
    await expectDialogClosed();

    expect(apiFetch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('confirmar o cancelamento mostra Cancelando… e atualiza a página', async () => {
    let answer: (response: Response) => void = () => {};
    vi.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    renderPanel(DRAWN);

    const dialog = await openCancel();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar sorteio' }),
    );

    expect(
      await within(dialog).findByRole('button', { name: 'Cancelando…' }),
    ).toBeDisabled();
    expect(apiFetch).toHaveBeenCalledWith(`/groups/${GROUP.id}/draw`, {
      method: 'DELETE',
    });
    expect(refresh).not.toHaveBeenCalled();

    answer(jsonResponse(204));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await expectDialogClosed();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra a mensagem da API no 409 do cancelamento e o genérico em outro erro', async () => {
    const cases: [() => Promise<Response>, string][] = [
      [
        () =>
          Promise.resolve(
            jsonResponse(409, {
              statusCode: 409,
              message: 'Este grupo ainda não fez o sorteio.',
            }),
          ),
        'Este grupo ainda não fez o sorteio.',
      ],
      [
        () => Promise.resolve(jsonResponse(500, { statusCode: 500 })),
        GENERIC_ERROR,
      ],
      [() => Promise.reject(new TypeError('Failed to fetch')), GENERIC_ERROR],
    ];

    for (const [failure, message] of cases) {
      vi.mocked(apiFetch).mockImplementationOnce(failure);
      const { unmount } = renderPanel(DRAWN);
      const dialog = await openCancel();
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Cancelar sorteio' }),
      );

      await expectDialogClosed();
      expect(await within(section()).findByRole('alert')).toHaveTextContent(
        message,
      );
      expect(refresh).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('a confirmação põe o foco em Ainda não e em Manter sorteio e prende o Tab', async () => {
    const user = userEvent.setup();
    const cases = [
      { data: panel(), open: openDraw, confirm: 'Sortear', keep: 'Ainda não' },
      {
        data: DRAWN,
        open: openCancel,
        confirm: 'Cancelar sorteio',
        keep: 'Manter sorteio',
      },
    ];

    for (const { data, open, confirm, keep } of cases) {
      const { unmount } = renderPanel(data);
      const dialog = await open();
      const keepButton = within(dialog).getByRole('button', { name: keep });
      const confirmButton = within(dialog).getByRole('button', {
        name: confirm,
      });
      await waitFor(() => expect(keepButton).toHaveFocus());

      // A guarda de foco do Base UI devolve o foco ao diálogo logo depois do Tab.
      await user.tab();
      await waitFor(() => expect(confirmButton).toHaveFocus());
      await user.tab();
      await waitFor(() => expect(keepButton).toHaveFocus());
      await user.tab({ shift: true });
      await waitFor(() => expect(confirmButton).toHaveFocus());
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
      unmount();
    }
  });
});
