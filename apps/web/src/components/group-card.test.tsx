import type { GroupSummary } from '@amigo-secreto/shared';
import { render, screen } from '@testing-library/react';
import { GroupCard } from './group-card';

const SUMMARY: GroupSummary = {
  id: '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b',
  name: 'Família Souza',
  status: 'OPEN',
  participantCount: 3,
  isOrganizer: false,
  // 10/12/2026 às 20:00 no horário de Brasília.
  drawScheduledAt: '2026-12-10T23:00:00.000Z',
  eventAt: '2026-12-20T22:00:00.000Z',
  createdAt: '2026-11-21T12:00:00.000Z',
  membershipStatus: 'APPROVED',
  organizerName: 'Ana Souza',
  pendingCount: null,
};

describe('GroupCard', () => {
  it('mostra nome, status, participantes e a linha da data', () => {
    render(<GroupCard group={SUMMARY} />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Família Souza' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ABERTO')).toBeInTheDocument();
    expect(screen.getByText('3 participantes')).toBeInTheDocument();
    expect(screen.getByText('Sorteio em 10/12/2026')).toBeInTheDocument();
  });

  it('mostra a tag Você organiza só para quem organiza', () => {
    const { unmount } = render(
      <GroupCard group={{ ...SUMMARY, isOrganizer: true }} />,
    );
    expect(screen.getByText('Você organiza')).toBeInTheDocument();
    unmount();

    render(<GroupCard group={SUMMARY} />);
    expect(screen.queryByText('Você organiza')).toBeNull();
  });

  it('é um link para a página do grupo', () => {
    render(<GroupCard group={SUMMARY} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/grupos/${SUMMARY.id}`);
    expect(link).toContainElement(
      screen.getByRole('heading', { name: 'Família Souza' }),
    );
    expect(link).toContainElement(screen.getByText('3 participantes'));
    expect(link).toContainElement(screen.getByText('Sorteio em 10/12/2026'));
  });
});
