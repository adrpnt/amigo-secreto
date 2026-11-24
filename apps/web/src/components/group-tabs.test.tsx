import { render, screen, within } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { GroupTabs } from './group-tabs';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';

function tabs() {
  const nav = screen.getByRole('navigation', { name: 'Seções do grupo' });
  return {
    group: within(nav).getByRole('link', { name: 'Grupo' }),
    participants: within(nav).getByRole('link', { name: 'Participantes' }),
  };
}

describe('GroupTabs', () => {
  it('mostra Grupo e Participantes com a aba atual marcada', () => {
    vi.mocked(usePathname).mockReturnValue(`/grupos/${GROUP_ID}`);
    const { unmount } = render(<GroupTabs groupId={GROUP_ID} />);
    expect(tabs().group).toHaveAttribute('aria-current', 'page');
    expect(tabs().participants).not.toHaveAttribute('aria-current');
    unmount();

    vi.mocked(usePathname).mockReturnValue(`/grupos/${GROUP_ID}/participantes`);
    render(<GroupTabs groupId={GROUP_ID} />);
    expect(tabs().participants).toHaveAttribute('aria-current', 'page');
    expect(tabs().group).not.toHaveAttribute('aria-current');
  });

  it('cada aba leva à sua rota', () => {
    vi.mocked(usePathname).mockReturnValue(`/grupos/${GROUP_ID}`);
    render(<GroupTabs groupId={GROUP_ID} />);

    expect(tabs().group).toHaveAttribute('href', `/grupos/${GROUP_ID}`);
    expect(tabs().participants).toHaveAttribute(
      'href',
      `/grupos/${GROUP_ID}/participantes`,
    );
  });
});
