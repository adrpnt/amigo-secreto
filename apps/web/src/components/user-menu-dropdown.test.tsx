import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenuDropdown } from './user-menu-dropdown';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe('UserMenuDropdown', () => {
  it('mostra Meus grupos, Perfil e Sair nesta ordem', async () => {
    render(
      <UserMenuDropdown
        name="Ana Souza"
        email="ana@example.com"
        avatarUrl={null}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Menu da conta' }),
    );
    const menu = await screen.findByRole('menu');
    const items = within(menu).getAllByRole('menuitem');

    expect(items.map((item) => item.textContent)).toEqual([
      'Meus grupos',
      'Perfil',
      'Sair',
    ]);
    expect(items[0]).toHaveAttribute('href', '/grupos');
    expect(items[1]).toHaveAttribute('href', '/perfil');
  });
});
