import type {
  GroupStatus,
  InviteView as Invite,
  InviteViewer,
} from '@amigo-secreto/shared';
import { render, screen } from '@testing-library/react';
import { InviteView } from './invite-view';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const CODE = 'abc234defg';
const NEXT = encodeURIComponent(`/convite/${CODE}`);

function invite(overrides: Partial<Invite> = {}): Invite {
  return {
    groupName: 'Família Souza',
    organizerName: 'Ana Souza',
    groupStatus: 'OPEN',
    requiresApproval: false,
    viewer: 'anonymous',
    groupId: null,
    ...overrides,
  };
}

function expectNoActions() {
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(screen.queryAllByRole('link')).toHaveLength(0);
}

describe('InviteView', () => {
  it('sem sessão mostra nome, Organizado por, o texto e os links Entrar e Criar conta com next', () => {
    render(<InviteView code={CODE} invite={invite()} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Família Souza' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Organizado por Ana Souza')).toBeInTheDocument();
    expect(
      screen.getByText('Para entrar no grupo, entre na sua conta ou crie uma.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      `/entrar?next=${NEXT}`,
    );
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute(
      'href',
      `/cadastro?next=${NEXT}`,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('mostra só o nome do grupo e de quem organiza', () => {
    const { container } = render(
      <InviteView code={CODE} invite={invite({ viewer: 'none' })} />,
    );

    expect(container).toHaveTextContent(
      /^Família SouzaOrganizado por Ana SouzaEntrar no grupo$/,
    );
  });

  it('pendente mostra o aviso com o nome de quem organiza e nenhum botão', () => {
    render(
      <InviteView
        code={CODE}
        invite={invite({ viewer: 'pending', requiresApproval: true })}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Seu pedido está aguardando a aprovação de Ana Souza.',
    );
    expectNoActions();
  });

  it('recusado mostra Sua entrada neste grupo não foi aprovada. sem botão', () => {
    render(<InviteView code={CODE} invite={invite({ viewer: 'rejected' })} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sua entrada neste grupo não foi aprovada.',
    );
    expectNoActions();
  });

  it('SORTEADO e ENCERRADO mostram o aviso do status sem botão', () => {
    const notices: [GroupStatus, string][] = [
      ['DRAWN', 'Este grupo já fez o sorteio e não aceita novas entradas.'],
      ['CLOSED', 'Este grupo foi encerrado e não aceita novas entradas.'],
    ];
    const viewers: InviteViewer[] = [
      'anonymous',
      'none',
      'pending',
      'rejected',
    ];
    for (const [groupStatus, notice] of notices) {
      for (const viewer of viewers) {
        const { unmount } = render(
          <InviteView code={CODE} invite={invite({ groupStatus, viewer })} />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent(notice);
        expectNoActions();
        unmount();
      }
    }
  });

  it('mostra a mensagem do 429', () => {
    render(
      <InviteView
        code={CODE}
        invite={{ tooMany: 'Muitas tentativas. Tente de novo em 1 minuto.' }}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Convite' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Muitas tentativas. Tente de novo em 1 minuto.',
    );
    expect(screen.queryByText('Organizado por', { exact: false })).toBeNull();
    expectNoActions();
  });

  it('mostra nome com marcação HTML como texto', () => {
    const { container } = render(
      <InviteView
        code={CODE}
        invite={invite({
          groupName: '<b>Família</b>',
          organizerName: '<i>Ana</i>',
        })}
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '<b>Família</b>',
    );
    expect(screen.getByText('Organizado por <i>Ana</i>')).toBeInTheDocument();
    expect(container.querySelector('b, i')).toBeNull();
  });
});
