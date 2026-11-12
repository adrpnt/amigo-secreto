import { render, screen, within } from '@testing-library/react';
import { AppHeader } from './app-header';
import { ThemeProvider } from './theme-provider';

describe('AppHeader', () => {
  it('mostra o nome Amigo Secreto e o botão de tema', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AppHeader />
      </ThemeProvider>,
    );

    const header = screen.getByRole('banner');
    expect(
      within(header).getByRole('link', { name: 'Amigo Secreto' }),
    ).toHaveAttribute('href', '/');
    expect(
      within(header).getByRole('button', { name: /Ativar tema/ }),
    ).toBeInTheDocument();
  });
});
