import type { GroupStatus } from '@amigo-secreto/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/lib/api-fetch';
import { GroupActions } from './group-actions';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';
const DELETE_TEXT =
  'O grupo e tudo o que há nele serão apagados para todos os participantes. Não dá para desfazer.';
const CLOSE_TEXT =
  'O grupo vai para Encerrados e não poderá mais ser editado nem reaberto.';

function renderActions(status: GroupStatus) {
  return render(
    <GroupActions group={{ id: GROUP_ID, name: 'Família Souza', status }} />,
  );
}

function jsonResponse(status: number, body?: object): Response {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  });
}

function actionNames(): string[] {
  const links = screen.queryAllByRole('link').map((link) => link.textContent);
  const buttons = screen
    .queryAllByRole('button')
    .map((button) => button.textContent);
  return [...links, ...buttons].filter((name): name is string => !!name);
}

async function openDialog(trigger: string, title: string) {
  await userEvent.click(screen.getByRole('button', { name: trigger }));
  return screen.findByRole('dialog', { name: title });
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  push.mockReset();
  refresh.mockReset();
});

describe('GroupActions', () => {
  it('mostra Editar grupo e Excluir grupo ao organizador de grupo ABERTO', () => {
    renderActions('OPEN');

    expect(actionNames()).toEqual(['Editar grupo', 'Excluir grupo']);
    expect(screen.getByRole('link', { name: 'Editar grupo' })).toHaveAttribute(
      'href',
      `/grupos/${GROUP_ID}/editar`,
    );
  });

  it('mostra Editar grupo, Encerrar grupo e Excluir grupo ao organizador de grupo SORTEADO', () => {
    renderActions('DRAWN');

    expect(actionNames()).toEqual([
      'Editar grupo',
      'Encerrar grupo',
      'Excluir grupo',
    ]);
  });

  it('mostra só Excluir grupo ao organizador de grupo ENCERRADO', () => {
    renderActions('CLOSED');

    expect(actionNames()).toEqual(['Excluir grupo']);
  });

  it('abre a confirmação de exclusão com o texto da spec', async () => {
    renderActions('OPEN');

    const dialog = await openDialog(
      'Excluir grupo',
      'Excluir o grupo Família Souza?',
    );
    expect(dialog).toHaveAccessibleDescription(DELETE_TEXT);
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Excluir grupo', 'Manter grupo']);
  });

  it('exclui e leva a /grupos ao confirmar', async () => {
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse(204));
    renderActions('DRAWN');

    const dialog = await openDialog(
      'Excluir grupo',
      'Excluir o grupo Família Souza?',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Excluir grupo' }),
    );

    await waitFor(() => expect(push).toHaveBeenCalledWith('/grupos'));
    expect(apiFetch).toHaveBeenCalledWith(`/groups/${GROUP_ID}`, {
      method: 'DELETE',
    });
  });

  it('abre a confirmação de encerramento com o texto da spec', async () => {
    renderActions('DRAWN');

    const dialog = await openDialog(
      'Encerrar grupo',
      'Encerrar o grupo Família Souza?',
    );
    expect(dialog).toHaveAccessibleDescription(CLOSE_TEXT);
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Encerrar grupo', 'Manter grupo']);
  });

  it('encerra e atualiza a página ao confirmar', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(200, { id: GROUP_ID, status: 'CLOSED' }),
    );
    renderActions('DRAWN');

    const dialog = await openDialog(
      'Encerrar grupo',
      'Encerrar o grupo Família Souza?',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Encerrar grupo' }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(apiFetch).toHaveBeenCalledWith(`/groups/${GROUP_ID}/close`, {
      method: 'POST',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(push).not.toHaveBeenCalled();
  });

  it('Manter grupo fecha a confirmação de encerramento sem chamar a API', async () => {
    renderActions('DRAWN');

    const dialog = await openDialog(
      'Encerrar grupo',
      'Encerrar o grupo Família Souza?',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Manter grupo' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(apiFetch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('mostra a mensagem da API quando o encerramento recebe 409', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(409, {
        statusCode: 409,
        message: 'Só um grupo sorteado pode ser encerrado.',
      }),
    );
    renderActions('DRAWN');

    const dialog = await openDialog(
      'Encerrar grupo',
      'Encerrar o grupo Família Souza?',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Encerrar grupo' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Só um grupo sorteado pode ser encerrado.',
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(refresh).not.toHaveBeenCalled();
  });

  it('desabilita o botão e mostra Excluindo… e Encerrando… durante o pedido', async () => {
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(() => {}));

    const { unmount } = renderActions('DRAWN');
    const deleteDialog = await openDialog(
      'Excluir grupo',
      'Excluir o grupo Família Souza?',
    );
    await userEvent.click(
      within(deleteDialog).getByRole('button', { name: 'Excluir grupo' }),
    );
    expect(
      within(deleteDialog).getByRole('button', { name: 'Excluindo…' }),
    ).toBeDisabled();
    unmount();

    renderActions('DRAWN');
    const closeDialog = await openDialog(
      'Encerrar grupo',
      'Encerrar o grupo Família Souza?',
    );
    await userEvent.click(
      within(closeDialog).getByRole('button', { name: 'Encerrar grupo' }),
    );
    expect(
      within(closeDialog).getByRole('button', { name: 'Encerrando…' }),
    ).toBeDisabled();
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('leva a /grupos quando o grupo já foi excluído', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(404, { statusCode: 404, message: 'Grupo não encontrado.' }),
    );
    renderActions('OPEN');

    const dialog = await openDialog(
      'Excluir grupo',
      'Excluir o grupo Família Souza?',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Excluir grupo' }),
    );

    await waitFor(() => expect(push).toHaveBeenCalledWith('/grupos'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra Não foi possível concluir. Tente de novo. num erro inesperado', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(
        jsonResponse(500, { statusCode: 500, message: 'Erro interno.' }),
      )
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderActions('DRAWN');

    let dialog = await openDialog(
      'Excluir grupo',
      'Excluir o grupo Família Souza?',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Excluir grupo' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível concluir. Tente de novo.',
    );

    // Falha de rede no encerramento.
    dialog = await openDialog(
      'Encerrar grupo',
      'Encerrar o grupo Família Souza?',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Encerrar grupo' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível concluir. Tente de novo.',
    );
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
