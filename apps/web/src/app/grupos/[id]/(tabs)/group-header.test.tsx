import type { GroupDetail } from '@amigo-secreto/shared';
import { render, screen } from '@testing-library/react';
import { GroupHeader } from './group-header';

const GROUP: GroupDetail = {
  id: '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b',
  name: 'Família Souza',
  status: 'OPEN',
  description: null,
  giftMinValue: null,
  giftMaxValue: null,
  drawScheduledAt: null,
  eventAt: null,
  eventLocation: null,
  isOnlineEvent: false,
  requiresApproval: false,
  owner: { id: '0b8a7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d', name: 'Ana Souza' },
  isOrganizer: false,
  closedAt: null,
  createdAt: '2026-11-21T12:00:00.000Z',
  inviteCode: 'ab23cd45ef',
};

describe('GroupHeader', () => {
  it('mostra nome, status e Organizado por', () => {
    const { unmount } = render(<GroupHeader group={GROUP} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Família Souza' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ABERTO')).toBeInTheDocument();
    expect(screen.getByText('Organizado por Ana Souza')).toBeInTheDocument();
    unmount();

    const { container } = render(
      <GroupHeader group={{ ...GROUP, name: '<i>Família</i>' }} />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: '<i>Família</i>' }),
    ).toBeInTheDocument();
    expect(container.querySelector('i')).toBeNull();
  });

  it('mostra Entrada com aprovação só para quem organiza', () => {
    const { unmount } = render(
      <GroupHeader
        group={{ ...GROUP, requiresApproval: true, isOrganizer: true }}
      />,
    );
    expect(screen.getByText('Entrada com aprovação')).toBeInTheDocument();
    unmount();

    const { unmount: unmountMember } = render(
      <GroupHeader
        group={{ ...GROUP, requiresApproval: true, isOrganizer: false }}
      />,
    );
    expect(screen.queryByText('Entrada com aprovação')).toBeNull();
    unmountMember();

    render(
      <GroupHeader
        group={{ ...GROUP, requiresApproval: false, isOrganizer: true }}
      />,
    );
    expect(screen.queryByText('Entrada com aprovação')).toBeNull();
  });
});
