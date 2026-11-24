import type { GroupDetail, GroupStatus } from '@amigo-secreto/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/lib/api-fetch';
import { InviteBlock } from './invite-block';

vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';
const SITE_URL = 'https://amigo.example.com';
const LINK = `${SITE_URL}/convite/abc23def45`;
const NEW_LINK = `${SITE_URL}/convite/xyz98wvu76`;
const REGENERATE_TEXT =
  'O link atual e os convites por e-mail já enviados deixam de funcionar. Quem já entrou continua no grupo.';

type GroupProps = Pick<
  GroupDetail,
  'id' | 'name' | 'status' | 'inviteCode' | 'isOrganizer'
>;

function renderBlock(overrides: Partial<GroupProps> = {}) {
  const group: GroupProps = {
    id: GROUP_ID,
    name: 'Família Souza',
    status: 'OPEN',
    inviteCode: 'abc23def45',
    isOrganizer: true,
    ...overrides,
  };
  return render(
    <InviteBlock
      group={group}
      siteUrl={SITE_URL}
      emailInvite={<p>Formulário de e-mails</p>}
    />,
  );
}

function jsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function linkField(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('textbox', {
    name: 'Link de convite',
  });
}

async function openRegenerate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Gerar novo link' }));
  return screen.findByRole('dialog', { name: 'Gerar um novo link?' });
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
});

describe('InviteBlock', () => {
  it('mostra Compartilhar no WhatsApp e o link inteiro num campo só leitura com Copiar link', () => {
    renderBlock({ isOrganizer: false });

    expect(
      screen.getByRole('link', { name: 'Compartilhar no WhatsApp' }),
    ).toBeVisible();
    expect(linkField()).toHaveValue(LINK);
    expect(linkField()).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeVisible();
  });

  it('Compartilhar no WhatsApp abre wa.me com o texto e o link', () => {
    renderBlock();

    const share = screen.getByRole('link', {
      name: 'Compartilhar no WhatsApp',
    });
    const href = share.getAttribute('href') ?? '';
    expect(href.startsWith('https://wa.me/?text=')).toBe(true);
    expect(new URL(href).searchParams.get('text')).toBe(
      `Vamos fazer amigo secreto! Entre no grupo Família Souza: ${LINK}`,
    );
    expect(share).toHaveAttribute('target', '_blank');
    expect(share).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('Copiar link copia e anuncia Link copiado', async () => {
    const user = userEvent.setup();
    renderBlock();

    expect(screen.getByRole('status')).toHaveTextContent('');
    await user.click(screen.getByRole('button', { name: 'Copiar link' }));

    expect(await navigator.clipboard.readText()).toBe(LINK);
    expect(screen.getByRole('status')).toHaveTextContent('Link copiado');
  });

  it('seleciona o link quando o navegador recusa a cópia', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('NotAllowedError'),
    );
    renderBlock();

    await user.click(screen.getByRole('button', { name: 'Copiar link' }));

    const field = linkField();
    await waitFor(() => expect(field).toHaveFocus());
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(LINK.length);
    expect(screen.getByRole('status')).not.toHaveTextContent('Link copiado');
  });

  it('mostra Convidar por e-mail e Gerar novo link só para quem organiza', () => {
    const { unmount } = renderBlock({ isOrganizer: true });

    expect(
      screen.getByRole('button', { name: 'Convidar por e-mail' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Gerar novo link' }),
    ).toBeVisible();
    unmount();

    renderBlock({ isOrganizer: false });

    expect(linkField()).toHaveValue(LINK);
    expect(
      screen.queryByRole('button', { name: 'Convidar por e-mail' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Gerar novo link' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Formulário de e-mails')).not.toBeInTheDocument();
  });

  it.each<[string, GroupStatus, string]>([
    [
      'troca o bloco pelo aviso com o grupo SORTEADO',
      'DRAWN',
      'Este grupo já fez o sorteio e não aceita novas entradas.',
    ],
    [
      'troca o bloco pelo aviso com o grupo ENCERRADO',
      'CLOSED',
      'Este grupo foi encerrado e não aceita novas entradas.',
    ],
  ])('%s', (_name, status, notice) => {
    renderBlock({ status, isOrganizer: true });

    expect(screen.getByText(notice)).toBeVisible();
    expect(
      screen.queryByRole('textbox', { name: 'Link de convite' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/abc23def45/)).not.toBeInTheDocument();
  });

  it('Gerar novo link confirma com os textos da spec e foco em Manter link', async () => {
    const user = userEvent.setup();
    renderBlock();

    const dialog = await openRegenerate(user);

    expect(dialog).toHaveAccessibleDescription(REGENERATE_TEXT);
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Gerar novo link', 'Manter link']);
    const keep = within(dialog).getByRole('button', { name: 'Manter link' });
    const confirm = within(dialog).getByRole('button', {
      name: 'Gerar novo link',
    });
    await waitFor(() => expect(keep).toHaveFocus());
    // A guarda de foco do Base UI devolve o foco ao diálogo logo depois do Tab.
    await user.tab();
    await waitFor(() => expect(confirm).toHaveFocus());
    await user.tab();
    await waitFor(() => expect(keep).toHaveFocus());
  });

  it('confirmar mostra o link novo e anuncia Novo link gerado', async () => {
    const user = userEvent.setup();
    let reply: (response: Response) => void = () => undefined;
    vi.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        reply = resolve;
      }),
    );
    renderBlock();

    const dialog = await openRegenerate(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Gerar novo link' }),
    );

    expect(
      within(dialog).getByRole('button', { name: 'Gerando…' }),
    ).toBeDisabled();
    expect(apiFetch).toHaveBeenCalledWith(
      `/groups/${GROUP_ID}/invite/regenerate`,
      { method: 'POST' },
    );
    reply(jsonResponse(200, { inviteCode: 'xyz98wvu76' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(linkField()).toHaveValue(NEW_LINK);
    const share = screen.getByRole('link', {
      name: 'Compartilhar no WhatsApp',
    });
    expect(
      new URL(share.getAttribute('href') ?? '').searchParams.get('text'),
    ).toBe(
      `Vamos fazer amigo secreto! Entre no grupo Família Souza: ${NEW_LINK}`,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Novo link gerado');
  });

  it('Manter link fecha sem trocar', async () => {
    const user = userEvent.setup();
    renderBlock();

    const dialog = await openRegenerate(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Manter link' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(apiFetch).not.toHaveBeenCalled();
    expect(linkField()).toHaveValue(LINK);
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('mostra a mensagem da API num 409 ou 429 ao gerar link', async () => {
    const user = userEvent.setup();
    const conflict = 'Com o sorteio feito, ninguém entra nem sai do grupo.';
    const tooMany = 'Muitas tentativas. Tente de novo em 12 minutos.';
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(
        jsonResponse(409, { statusCode: 409, message: conflict }),
      )
      .mockResolvedValueOnce(
        jsonResponse(429, { statusCode: 429, message: tooMany }),
      );
    renderBlock();

    for (const message of [conflict, tooMany]) {
      const dialog = await openRegenerate(user);
      await user.click(
        within(dialog).getByRole('button', { name: 'Gerar novo link' }),
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(linkField()).toHaveValue(LINK);
      expect(screen.getByRole('status')).not.toHaveTextContent(
        'Novo link gerado',
      );
    }
  });

  it('Convidar por e-mail mostra e esconde o formulário', async () => {
    const user = userEvent.setup();
    renderBlock();

    const toggle = screen.getByRole('button', { name: 'Convidar por e-mail' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Formulário de e-mails')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Formulário de e-mails')).toBeVisible();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Formulário de e-mails')).not.toBeInTheDocument();
  });
});
