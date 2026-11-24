import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/lib/api-fetch';
import { EmailInviteForm } from './email-invite-form';

vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';
const HINT = 'Separe por vírgula ou um por linha. Todos recebem o mesmo link.';

function jsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function emailsField(): HTMLTextAreaElement {
  return screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'E-mails' });
}

function sendButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Enviar convites' });
}

async function send(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.clear(emailsField());
  if (text) await user.type(emailsField(), text);
  await user.click(sendButton());
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
});

describe('EmailInviteForm', () => {
  it('mostra o campo E-mails e Enviar convites', () => {
    render(<EmailInviteForm groupId={GROUP_ID} />);

    expect(emailsField().tagName).toBe('TEXTAREA');
    expect(emailsField()).toHaveAccessibleDescription(HINT);
    expect(emailsField()).toHaveAttribute(
      'placeholder',
      'ana@exemplo.com, bruno@exemplo.com',
    );
    expect(sendButton()).toBeEnabled();
  });

  it('mostra Informe pelo menos um e-mail. sem enviar', async () => {
    const user = userEvent.setup();
    render(<EmailInviteForm groupId={GROUP_ID} />);

    await send(user, '  ;, ');

    expect(emailsField()).toHaveAttribute('aria-invalid', 'true');
    expect(emailsField()).toHaveAccessibleDescription(
      'Informe pelo menos um e-mail.',
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('lista os inválidos sem enviar', async () => {
    const user = userEvent.setup();
    render(<EmailInviteForm groupId={GROUP_ID} />);

    await send(user, 'ana@exemplo.com; bruno@ carla.exemplo.com');

    expect(emailsField()).toHaveAttribute('aria-invalid', 'true');
    expect(emailsField()).toHaveAccessibleDescription(
      'Confira estes e-mails: bruno@, carla.exemplo.com',
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('recusa mais de 20 sem enviar', async () => {
    const user = userEvent.setup();
    render(<EmailInviteForm groupId={GROUP_ID} />);
    const emails = Array.from(
      { length: 21 },
      (_, index) => `pessoa${index + 1}@exemplo.com`,
    );

    await send(user, emails.join(', '));

    expect(emailsField()).toHaveAccessibleDescription(
      'Envie no máximo 20 e-mails por vez.',
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('envia e mostra Convite enviado para 1 e-mail. e Convites enviados para N e-mails.', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(jsonResponse(200, { count: 1 }))
      .mockResolvedValueOnce(jsonResponse(200, { count: 2 }));
    render(<EmailInviteForm groupId={GROUP_ID} />);

    await send(user, 'ana@exemplo.com');

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Convite enviado para 1 e-mail.',
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      `/groups/${GROUP_ID}/invite/emails`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: 'ana@exemplo.com' }),
      },
    );
    expect(emailsField()).toHaveValue('');
    expect(emailsField()).not.toHaveAttribute('aria-invalid');

    await send(user, 'bruno@exemplo.com\nBRUNO@exemplo.com carla@exemplo.com');

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Convites enviados para 2 e-mails.',
      ),
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      `/groups/${GROUP_ID}/invite/emails`,
      expect.objectContaining({
        body: JSON.stringify({
          emails: 'bruno@exemplo.com\nBRUNO@exemplo.com carla@exemplo.com',
        }),
      }),
    );

    await user.type(emailsField(), 'd');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('desabilita o botão e mostra Enviando… durante o envio', async () => {
    const user = userEvent.setup();
    let reply: (response: Response) => void = () => undefined;
    vi.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        reply = resolve;
      }),
    );
    render(<EmailInviteForm groupId={GROUP_ID} />);

    await send(user, 'ana@exemplo.com');

    const pending = screen.getByRole('button', { name: 'Enviando…' });
    expect(pending).toBeDisabled();
    reply(jsonResponse(200, { count: 1 }));
    await waitFor(() => expect(sendButton()).toBeEnabled());
  });

  it('mostra a mensagem do 429 e do 409 da API', async () => {
    const user = userEvent.setup();
    const tooMany =
      'Este grupo chegou ao limite de 100 convites por e-mail em 24 horas. Tente de novo em 3 horas.';
    const conflict = 'Com o sorteio feito, ninguém entra nem sai do grupo.';
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(
        jsonResponse(429, { statusCode: 429, message: tooMany }),
      )
      .mockResolvedValueOnce(
        jsonResponse(409, { statusCode: 409, message: conflict }),
      );
    render(<EmailInviteForm groupId={GROUP_ID} />);

    await send(user, 'ana@exemplo.com');
    expect(await screen.findByRole('alert')).toHaveTextContent(tooMany);
    expect(emailsField()).toHaveValue('ana@exemplo.com');

    await user.click(sendButton());
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(conflict),
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra o erro do campo num 400 da API', async () => {
    const user = userEvent.setup();
    const message = 'Confira estes e-mails: ana@exemplo';
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(400, {
        statusCode: 400,
        message: 'Dados inválidos.',
        error: 'Bad Request',
        fields: { emails: message },
      }),
    );
    render(<EmailInviteForm groupId={GROUP_ID} />);

    await send(user, 'ana@exemplo.com');

    await waitFor(() =>
      expect(emailsField()).toHaveAccessibleDescription(message),
    );
    expect(emailsField()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
