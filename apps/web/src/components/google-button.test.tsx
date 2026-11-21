import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleButton } from './google-button';

const GUIDANCE =
  'Para entrar com Google, abra esta página no navegador do celular.';

describe('GoogleButton', () => {
  it('não aparece com googleEnabled false', () => {
    const { container, rerender } = render(
      <GoogleButton googleEnabled={false} inAppBrowser={false} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<GoogleButton googleEnabled={false} inAppBrowser />);
    expect(container).toBeEmptyDOMElement();
  });

  it('leva a /api/auth/google/start com o destino', () => {
    const { rerender } = render(
      <GoogleButton googleEnabled inAppBrowser={false} next="/convite/abc" />,
    );
    expect(
      screen.getByRole('link', { name: 'Entrar com Google' }),
    ).toHaveAttribute('href', '/api/auth/google/start?next=%2Fconvite%2Fabc');

    rerender(<GoogleButton googleEnabled inAppBrowser={false} />);
    expect(
      screen.getByRole('link', { name: 'Entrar com Google' }),
    ).toHaveAttribute('href', '/api/auth/google/start');
  });

  it('mostra a orientação e "Copiar link" no lugar do botão no navegador interno', () => {
    render(<GoogleButton googleEnabled inAppBrowser next="/convite/abc" />);

    expect(screen.getByText(GUIDANCE)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Entrar com Google' }),
    ).not.toBeInTheDocument();
  });

  it('copia o endereço da página e mostra "Link copiado."', async () => {
    const user = userEvent.setup();
    render(<GoogleButton googleEnabled inAppBrowser />);
    expect(screen.queryByText('Link copiado.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copiar link' }));

    expect(await navigator.clipboard.readText()).toBe(location.href);
    expect(screen.getByRole('status')).toHaveTextContent('Link copiado.');
  });

  it('mostra o endereço selecionado num campo quando o navegador não deixa copiar', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new DOMException('Sem permissão', 'NotAllowedError'),
    );
    render(<GoogleButton googleEnabled inAppBrowser />);

    await user.click(screen.getByRole('button', { name: 'Copiar link' }));

    const field = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Endereço desta página',
    });
    expect(field).toHaveValue(location.href);
    expect(field).toHaveAttribute('readonly');
    expect(field).toHaveFocus();
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(location.href.length);
    expect(screen.queryByText('Link copiado.')).not.toBeInTheDocument();
  });
});
