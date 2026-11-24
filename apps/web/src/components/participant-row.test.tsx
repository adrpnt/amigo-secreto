import type { GroupStatus, MemberItem } from '@amigo-secreto/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParticipantRow } from './participant-row';

const ORGANIZER: MemberItem = {
  membershipId: '0b8f4c1e-2d3a-4e5f-8a9b-1c2d3e4f5a6b',
  name: 'Ana Souza',
  avatarUrl: 'https://lh3.googleusercontent.com/a/ana',
  status: 'APPROVED',
  isOrganizer: true,
};

const MEMBER: MemberItem = {
  membershipId: '7c6d5e4f-3a2b-4c1d-9e8f-7a6b5c4d3e2f',
  name: 'Bruno Lima',
  avatarUrl: null,
  status: 'APPROVED',
  isOrganizer: false,
};

// O jsdom não carrega imagens; esta troca faz a foto "carregar" para o avatar
// mostrá-la no lugar das iniciais.
class LoadedImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  complete = false;
  naturalWidth = 0;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

function renderRow({
  member = MEMBER,
  canManage = true,
  groupStatus = 'OPEN',
}: {
  member?: MemberItem;
  canManage?: boolean;
  groupStatus?: GroupStatus;
} = {}) {
  const actions = {
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onRemove: vi.fn(),
    onTransfer: vi.fn(),
  };
  render(
    <ParticipantRow
      member={member}
      canManage={canManage}
      groupStatus={groupStatus}
      {...actions}
    />,
  );
  return actions;
}

async function openMenu(name: string) {
  await userEvent.click(
    screen.getByRole('button', { name: `Ações para ${name}` }),
  );
  return screen.findByRole('menu');
}

describe('ParticipantRow', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra avatar, nome e a tag Organiza em quem organiza', async () => {
    vi.stubGlobal('Image', LoadedImage);
    const { container } = render(
      <ParticipantRow
        member={ORGANIZER}
        canManage={false}
        groupStatus="OPEN"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRemove={vi.fn()}
        onTransfer={vi.fn()}
      />,
    );

    await vi.waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        ORGANIZER.avatarUrl,
      ),
    );
    const name = screen.getByText('Ana Souza');
    expect(name).toHaveClass('truncate');
    expect(screen.getByText('Organiza')).toHaveTextContent(/^Organiza$/);
  });

  it('mostra iniciais sem foto e nunca o e-mail', () => {
    renderRow({ canManage: true });

    expect(screen.getByText('BL')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('@');
  });

  it('pendente mostra Pendente e os botões Aprovar {nome} e Recusar {nome}', async () => {
    const actions = renderRow({ member: { ...MEMBER, status: 'PENDING' } });

    expect(screen.getByText('Pendente')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Aprovar Bruno Lima' }),
    );
    expect(actions.onApprove).toHaveBeenCalledTimes(1);
    await userEvent.click(
      screen.getByRole('button', { name: 'Recusar Bruno Lima' }),
    );
    expect(actions.onReject).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Ações para/ })).toBeNull();
  });

  it('recusado mostra Recusado e Aprovar {nome}', async () => {
    const actions = renderRow({ member: { ...MEMBER, status: 'REJECTED' } });

    expect(screen.getByText('Recusado')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Aprovar Bruno Lima' }),
    );
    expect(actions.onApprove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /^Recusar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ações para/ })).toBeNull();
  });

  it('menu de quem organiza mostra Transferir organização e Remover do grupo com o grupo ABERTO', async () => {
    const actions = renderRow({ groupStatus: 'OPEN' });

    const menu = await openMenu('Bruno Lima');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Transferir organização', 'Remover do grupo']);

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Remover do grupo' }),
    );
    expect(actions.onRemove).toHaveBeenCalledTimes(1);

    await userEvent.click(
      within(await openMenu('Bruno Lima')).getByRole('menuitem', {
        name: 'Transferir organização',
      }),
    );
    expect(actions.onTransfer).toHaveBeenCalledTimes(1);
  });

  it('com o grupo SORTEADO o menu mostra só Transferir organização', async () => {
    renderRow({ groupStatus: 'DRAWN' });

    const menu = await openMenu('Bruno Lima');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Transferir organização']);
  });

  it('sem menu na linha de quem organiza e para quem não organiza', () => {
    const { unmount } = render(
      <ParticipantRow
        member={ORGANIZER}
        canManage
        groupStatus="OPEN"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRemove={vi.fn()}
        onTransfer={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    unmount();

    renderRow({ canManage: false });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('não mostra Aprovar nem Recusar com o grupo fora de ABERTO', () => {
    for (const groupStatus of ['DRAWN', 'CLOSED'] as const) {
      for (const status of ['PENDING', 'REJECTED'] as const) {
        const { unmount } = render(
          <ParticipantRow
            member={{ ...MEMBER, status }}
            canManage
            groupStatus={groupStatus}
            onApprove={vi.fn()}
            onReject={vi.fn()}
            onRemove={vi.fn()}
            onTransfer={vi.fn()}
          />,
        );
        expect(screen.queryByRole('button')).toBeNull();
        unmount();
      }
    }
  });
});
