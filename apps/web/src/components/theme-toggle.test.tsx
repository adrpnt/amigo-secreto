import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

function renderWithSavedTheme(theme: 'light' | 'dark') {
  localStorage.setItem('theme', theme);
  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  it('troca para o tema escuro quando o claro está ativo', async () => {
    renderWithSavedTheme('light');

    await userEvent.click(screen.getByRole('button'));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('troca para o tema claro quando o escuro está ativo', async () => {
    renderWithSavedTheme('dark');

    await userEvent.click(screen.getByRole('button'));

    expect(document.documentElement).toHaveClass('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
