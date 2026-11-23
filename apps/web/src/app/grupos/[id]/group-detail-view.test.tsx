import type { GroupDetail } from '@amigo-secreto/shared';
import { render, screen, within } from '@testing-library/react';
import { GroupDetailView } from './group-detail-view';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const FULL_GROUP: GroupDetail = {
  id: '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b',
  name: 'Família Souza',
  status: 'OPEN',
  description: 'Tragam algo feito à mão!',
  giftMinValue: 50,
  giftMaxValue: 100,
  // 10/12/2026 às 20:00 e 20/12/2026 às 19:00 no horário de Brasília.
  drawScheduledAt: '2026-12-10T23:00:00.000Z',
  eventAt: '2026-12-20T22:00:00.000Z',
  eventLocation: 'Casa da vó',
  isOnlineEvent: false,
  requiresApproval: false,
  owner: { id: '0b8a7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d', name: 'Ana Souza' },
  isOrganizer: false,
  closedAt: null,
  createdAt: '2026-11-21T12:00:00.000Z',
  inviteCode: 'ab23cd45ef',
};

const EMPTY_GROUP: GroupDetail = {
  ...FULL_GROUP,
  description: null,
  giftMinValue: null,
  giftMaxValue: null,
  drawScheduledAt: null,
  eventAt: null,
  eventLocation: null,
};

const FIELD_LABELS = [
  'Valor do presente',
  'Sorteio previsto',
  'Confraternização',
  'Local',
];

// Valor mostrado ao lado do rótulo na lista de dados do grupo.
function fieldValue(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: 'dt' });
  const item = term.parentElement as HTMLElement;
  return within(item).getByRole('definition');
}

function actionNames(): string[] {
  return [
    ...screen.queryAllByRole('link'),
    ...screen.queryAllByRole('button'),
  ].map((element) => element.textContent ?? '');
}

describe('GroupDetailView', () => {
  it('mostra os campos preenchidos e Organizado por', () => {
    render(<GroupDetailView group={FULL_GROUP} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Família Souza' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ABERTO')).toBeInTheDocument();
    expect(screen.getByText('Organizado por Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Tragam algo feito à mão!')).toBeInTheDocument();
    expect(fieldValue('Valor do presente')).toHaveTextContent('R$ 50 a R$ 100');
    expect(fieldValue('Sorteio previsto')).toHaveTextContent(
      '10/12/2026 às 20:00',
    );
    expect(fieldValue('Confraternização')).toHaveTextContent(
      '20/12/2026 às 19:00',
    );
    expect(fieldValue('Local')).toHaveTextContent('Casa da vó');
  });

  it('omite os campos vazios', () => {
    render(<GroupDetailView group={EMPTY_GROUP} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Família Souza' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Organizado por Ana Souza')).toBeInTheDocument();
    for (const label of FIELD_LABELS) {
      expect(screen.queryByText(label, { selector: 'dt' })).toBeNull();
    }
    expect(screen.queryByText('Tragam algo feito à mão!')).toBeNull();
    expect(screen.queryByText('Evento online')).toBeNull();
  });

  it('mostra Evento online junto do local', () => {
    const { unmount } = render(
      <GroupDetailView group={{ ...FULL_GROUP, isOnlineEvent: true }} />,
    );
    const local = fieldValue('Local');
    expect(local).toHaveTextContent('Casa da vó');
    expect(within(local).getByText('Evento online')).toBeInTheDocument();
    unmount();

    render(
      <GroupDetailView
        group={{ ...EMPTY_GROUP, isOnlineEvent: true, eventLocation: null }}
      />,
    );
    expect(
      within(fieldValue('Local')).getByText('Evento online'),
    ).toBeInTheDocument();
  });

  it('mostra Entrada com aprovação só para quem organiza', () => {
    const { unmount } = render(
      <GroupDetailView
        group={{ ...FULL_GROUP, requiresApproval: true, isOrganizer: true }}
      />,
    );
    expect(screen.getByText('Entrada com aprovação')).toBeInTheDocument();
    unmount();

    const { unmount: unmountMember } = render(
      <GroupDetailView
        group={{ ...FULL_GROUP, requiresApproval: true, isOrganizer: false }}
      />,
    );
    expect(screen.queryByText('Entrada com aprovação')).toBeNull();
    unmountMember();

    render(
      <GroupDetailView
        group={{ ...FULL_GROUP, requiresApproval: false, isOrganizer: true }}
      />,
    );
    expect(screen.queryByText('Entrada com aprovação')).toBeNull();
  });

  it('não mostra ações a quem não organiza', () => {
    const { unmount } = render(
      <GroupDetailView
        group={{ ...FULL_GROUP, status: 'DRAWN', isOrganizer: false }}
      />,
    );
    expect(actionNames()).toEqual([]);
    unmount();

    render(
      <GroupDetailView
        group={{ ...FULL_GROUP, status: 'DRAWN', isOrganizer: true }}
      />,
    );
    expect(actionNames()).toEqual([
      'Editar grupo',
      'Encerrar grupo',
      'Excluir grupo',
    ]);
  });

  it('mostra o recado com quebras de linha e marcação HTML como texto', () => {
    const { container } = render(
      <GroupDetailView
        group={{
          ...FULL_GROUP,
          name: '<i>Família</i>',
          description: '<b>Oi</b>\nTragam algo feito à mão!',
          eventLocation: '<script>alert(1)</script>',
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: '<i>Família</i>' }),
    ).toBeInTheDocument();
    const description = screen.getByText(/Tragam algo feito à mão!/);
    expect(description.textContent).toBe('<b>Oi</b>\nTragam algo feito à mão!');
    expect(description).toHaveClass('whitespace-pre-line');
    expect(fieldValue('Local')).toHaveTextContent('<script>alert(1)</script>');
    expect(container.querySelector('b, i, script')).toBeNull();
  });
});
