import type { ExclusionsResponse, GroupStatus } from '@amigo-secreto/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/lib/api-fetch';
import { ExclusionEditor } from './exclusion-editor';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';
const NOTICE = 'Só você, que organiza, vê estas restrições.';
const LOCKED_NOTE = 'Para mudar as restrições, cancele o sorteio.';
const EMPTY =
  'Nenhum par cadastrado. Todos podem tirar todos, menos a si mesmos.';

const ANA = { membershipId: 'm-ana', name: 'Ana Souza' };
const BRUNO = { membershipId: 'm-bruno', name: 'Bruno Lima' };
const CARLA = { membershipId: 'm-carla', name: 'Carla Dias' };
const PAIR = { id: 'pair-1', a: ANA, b: BRUNO };

const WITH_PAIR: ExclusionsResponse = {
  participants: [ANA, BRUNO, CARLA],
  pairs: [PAIR],
};
const NO_PAIRS: ExclusionsResponse = {
  participants: [ANA, BRUNO, CARLA],
  pairs: [],
};

function renderEditor(
  exclusions: ExclusionsResponse = WITH_PAIR,
  status: GroupStatus = 'OPEN',
) {
  return render(
    <ExclusionEditor
      groupId={GROUP_ID}
      status={status}
      exclusions={exclusions}
    />,
  );
}

function jsonResponse(status: number, body?: object): Response {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  });
}

function section() {
  return screen.getByRole('region', { name: 'Quem não tira quem' });
}

function personField() {
  return screen.getByRole('combobox', { name: 'Pessoa' });
}

function otherField() {
  return screen.getByRole('combobox', {
    name: 'Não tira e não é tirada por',
  });
}

async function choose(a: string, b: string) {
  if (a) await userEvent.selectOptions(personField(), a);
  if (b) await userEvent.selectOptions(otherField(), b);
}

async function add() {
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar par' }));
}

function pairItems() {
  return within(section())
    .queryAllByRole('listitem')
    .map((item) => item.textContent);
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  refresh.mockReset();
});

describe('ExclusionEditor', () => {
  it('mostra o título, o aviso, os campos com os aprovados e Adicionar par', () => {
    renderEditor();

    expect(
      within(section()).getByRole('heading', {
        level: 2,
        name: 'Quem não tira quem',
      }),
    ).toBeInTheDocument();
    expect(within(section()).getByText(NOTICE)).toBeInTheDocument();
    for (const field of [personField(), otherField()]) {
      expect(
        within(field)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual([
        'Escolha uma pessoa',
        'Ana Souza',
        'Bruno Lima',
        'Carla Dias',
      ]);
      expect(field).toHaveValue('');
    }
    expect(
      screen.getByRole('button', { name: 'Adicionar par' }),
    ).toBeInTheDocument();
  });

  it('adiciona o par e atualiza a página', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(201, { id: 'pair-2', a: ANA, b: CARLA }),
    );
    renderEditor();

    await choose('Carla Dias', 'Ana Souza');
    await add();

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledWith(`/groups/${GROUP_ID}/exclusions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 'm-carla', b: 'm-ana' }),
    });
    expect(personField()).toHaveValue('');
    expect(otherField()).toHaveValue('');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra Escolha as duas pessoas do par. sem enviar', async () => {
    renderEditor();

    await choose('Ana Souza', '');
    await add();

    expect(
      await screen.findByText('Escolha as duas pessoas do par.'),
    ).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('mostra Escolha duas pessoas diferentes. sem enviar', async () => {
    renderEditor();

    await choose('Carla Dias', 'Carla Dias');
    await add();

    expect(
      await screen.findByText('Escolha duas pessoas diferentes.'),
    ).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('mostra Esse par já está na lista. em qualquer ordem sem enviar', async () => {
    renderEditor();

    await choose('Bruno Lima', 'Ana Souza');
    await add();
    expect(
      await screen.findByText('Esse par já está na lista.'),
    ).toBeInTheDocument();

    await choose('Ana Souza', 'Bruno Lima');
    await add();
    expect(
      await screen.findByText('Esse par já está na lista.'),
    ).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('mostra o erro da API no 400, 404 e 409', async () => {
    const cases: [Response, 'field' | 'alert', string][] = [
      [
        jsonResponse(400, {
          statusCode: 400,
          message: 'Dados inválidos.',
          fields: { a: 'Esse par já está na lista.' },
        }),
        'field',
        'Esse par já está na lista.',
      ],
      [
        jsonResponse(404, {
          statusCode: 404,
          message: 'Participante não encontrado.',
        }),
        'alert',
        'Participante não encontrado.',
      ],
      [
        jsonResponse(409, {
          statusCode: 409,
          message: 'Para mudar as restrições, cancele o sorteio.',
        }),
        'alert',
        'Para mudar as restrições, cancele o sorteio.',
      ],
    ];

    for (const [response, place, message] of cases) {
      vi.mocked(apiFetch).mockResolvedValueOnce(response);
      const { unmount } = renderEditor();
      await choose('Ana Souza', 'Carla Dias');
      await add();

      if (place === 'field') {
        await waitFor(() =>
          expect(personField()).toHaveAccessibleDescription(message),
        );
        expect(screen.queryByRole('alert')).toBeNull();
      } else {
        expect(await screen.findByRole('alert')).toHaveTextContent(message);
        expect(personField()).not.toHaveAttribute('aria-invalid');
      }
      expect(refresh).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('remove o par sem confirmação e atualiza a página', async () => {
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse(204));
    renderEditor();

    expect(pairItems()).toEqual(['Ana Souza e Bruno Lima']);
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remover par Ana Souza e Bruno Lima',
      }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledWith(
      `/groups/${GROUP_ID}/exclusions/pair-1`,
      { method: 'DELETE' },
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('mostra o erro da API ao remover o par', async () => {
    const cases: [() => Promise<Response>, string][] = [
      [
        () =>
          Promise.resolve(
            jsonResponse(409, {
              statusCode: 409,
              message: 'Para mudar as restrições, cancele o sorteio.',
            }),
          ),
        'Para mudar as restrições, cancele o sorteio.',
      ],
      [
        () =>
          Promise.resolve(
            jsonResponse(403, {
              statusCode: 403,
              message: 'Só quem organiza pode alterar o grupo.',
            }),
          ),
        'Não foi possível concluir. Tente de novo.',
      ],
      [
        () => Promise.resolve(jsonResponse(500, { statusCode: 500 })),
        'Não foi possível concluir. Tente de novo.',
      ],
      [
        () => Promise.reject(new TypeError('Failed to fetch')),
        'Não foi possível concluir. Tente de novo.',
      ],
    ];

    for (const [failure, message] of cases) {
      vi.mocked(apiFetch).mockImplementationOnce(failure);
      const { unmount } = renderEditor();
      await userEvent.click(
        screen.getByRole('button', {
          name: 'Remover par Ana Souza e Bruno Lima',
        }),
      );

      expect(await within(section()).findByRole('alert')).toHaveTextContent(
        message,
      );
      expect(pairItems()).toEqual(['Ana Souza e Bruno Lima']);
      expect(personField()).not.toHaveAttribute('aria-invalid');
      expect(refresh).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('mostra Nenhum par cadastrado. sem pares', () => {
    renderEditor(NO_PAIRS);

    expect(within(section()).getByText(EMPTY)).toBeInTheDocument();
    expect(pairItems()).toEqual([]);
  });

  it('só leitura no grupo SORTEADO mostra a nota e nenhum controle', () => {
    renderEditor(WITH_PAIR, 'DRAWN');

    expect(pairItems()).toEqual(['Ana Souza e Bruno Lima']);
    expect(within(section()).getByText(LOCKED_NOTE)).toBeInTheDocument();
    expect(within(section()).queryAllByRole('button')).toEqual([]);
    expect(within(section()).queryAllByRole('combobox')).toEqual([]);
  });

  it('só leitura no grupo ENCERRADO não mostra a nota nem controles', () => {
    renderEditor(WITH_PAIR, 'CLOSED');

    expect(pairItems()).toEqual(['Ana Souza e Bruno Lima']);
    expect(within(section()).queryByText(LOCKED_NOTE)).toBeNull();
    expect(within(section()).queryAllByRole('button')).toEqual([]);
    expect(within(section()).queryAllByRole('combobox')).toEqual([]);
  });

  it('liga o erro ao campo por aria-describedby', async () => {
    renderEditor();

    await choose('Ana Souza', 'Ana Souza');
    await add();

    await waitFor(() =>
      expect(personField()).toHaveAccessibleDescription(
        'Escolha duas pessoas diferentes.',
      ),
    );
    expect(personField()).toHaveAttribute('aria-invalid', 'true');

    await userEvent.selectOptions(otherField(), 'Bruno Lima');
    await waitFor(() =>
      expect(personField()).not.toHaveAccessibleDescription(),
    );
    expect(personField()).not.toHaveAttribute('aria-invalid');
  });
});
