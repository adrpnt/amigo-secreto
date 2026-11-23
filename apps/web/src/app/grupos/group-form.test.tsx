import { GROUP_MESSAGES, type GroupDetail } from '@amigo-secreto/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/lib/api-fetch';
import { GroupForm } from './group-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';

const GROUP: GroupDetail = {
  id: GROUP_ID,
  name: 'Família Souza',
  status: 'OPEN',
  description: 'Traga o presente embrulhado.\nSem roupa.',
  giftMinValue: 50,
  giftMaxValue: 100,
  // 10/12/2099 às 20:00 e 20/12/2099 às 19:00 no horário de Brasília.
  drawScheduledAt: '2099-12-10T23:00:00.000Z',
  eventAt: '2099-12-20T22:00:00.000Z',
  eventLocation: 'Casa da vó',
  isOnlineEvent: true,
  requiresApproval: true,
  owner: { id: '0b7f6c1e-3a52-4d0e-9f7a-2c1d5e8b9a10', name: 'Ana Souza' },
  isOrganizer: true,
  closedAt: null,
  createdAt: '2026-11-21T12:00:00.000Z',
  inviteCode: 'ab23cd45ef',
};

function jsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function field(label: string) {
  return screen.getByLabelText(label);
}

// O jsdom não abre o seletor do datetime-local; o valor entra como o navegador
// o entrega.
function setDate(label: string, value: string) {
  fireEvent.change(field(label), { target: { value } });
}

function sentBody(): Record<string, unknown> {
  const [, init] = vi.mocked(apiFetch).mock.calls[0];
  return JSON.parse(init?.body as string) as Record<string, unknown>;
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  push.mockReset();
});

describe('GroupForm', () => {
  it('mostra a mensagem de cada regra violada antes de enviar', async () => {
    const user = userEvent.setup();
    render(<GroupForm />);

    await user.click(field('Recado para os participantes'));
    await user.paste('a'.repeat(1001));
    await user.type(field('Valor do presente (R$)'), '0');
    setDate('Sorteio previsto', '2000-01-01T10:00');
    await user.click(field('Local'));
    await user.paste('b'.repeat(201));
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));

    expect(field('Nome do grupo')).toHaveAccessibleDescription(
      GROUP_MESSAGES.name,
    );
    expect(field('Recado para os participantes')).toHaveAccessibleDescription(
      GROUP_MESSAGES.descriptionTooLong,
    );
    expect(field('Valor do presente (R$)')).toHaveAccessibleDescription(
      GROUP_MESSAGES.giftValue,
    );
    // Com o "Até (R$)" vazio, a mensagem do valor fica só no primeiro campo.
    expect(field('Até (R$)')).not.toHaveAttribute('aria-invalid');
    expect(field('Até (R$)')).toHaveAccessibleDescription('');
    expect(field('Sorteio previsto')).toHaveAccessibleDescription(
      GROUP_MESSAGES.futureDate,
    );
    expect(field('Local')).toHaveAccessibleDescription(
      GROUP_MESSAGES.locationTooLong,
    );

    // As regras entre dois campos, com cada campo válido sozinho.
    await user.type(field('Nome do grupo'), 'Família');
    await user.clear(field('Valor do presente (R$)'));
    await user.type(field('Até (R$)'), '50');
    setDate('Sorteio previsto', '2099-12-21T10:00');
    setDate('Confraternização', '2099-12-20T19:00');
    expect(field('Valor do presente (R$)')).toHaveAccessibleDescription(
      GROUP_MESSAGES.giftRangeStart,
    );
    expect(field('Sorteio previsto')).toHaveAccessibleDescription(
      GROUP_MESSAGES.drawBeforeEvent,
    );

    await user.type(field('Valor do presente (R$)'), '100');
    expect(field('Valor do presente (R$)')).toHaveAccessibleDescription(
      GROUP_MESSAGES.giftRangeOrder,
    );
    expect(field('Nome do grupo')).toHaveAccessibleDescription('');

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('mostra as mensagens dos campos de um 400 da API', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(400, {
        statusCode: 400,
        message: 'Dados inválidos.',
        fields: {
          name: GROUP_MESSAGES.name,
          giftMinValue: GROUP_MESSAGES.giftValue,
          giftMaxValue: GROUP_MESSAGES.giftValue,
          eventAt: GROUP_MESSAGES.futureDate,
        },
      }),
    );
    render(<GroupForm />);

    await user.type(field('Nome do grupo'), 'Família');
    await user.type(field('Valor do presente (R$)'), '50');
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));

    expect(await screen.findByText(GROUP_MESSAGES.name)).toBeInTheDocument();
    expect(field('Nome do grupo')).toHaveAccessibleDescription(
      GROUP_MESSAGES.name,
    );
    expect(field('Valor do presente (R$)')).toHaveAccessibleDescription(
      GROUP_MESSAGES.giftValue,
    );
    expect(field('Até (R$)')).toHaveAccessibleDescription('');
    expect(field('Confraternização')).toHaveAccessibleDescription(
      GROUP_MESSAGES.futureDate,
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('mostra a mensagem da API num 429', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(429, {
        statusCode: 429,
        message: 'Muitas tentativas. Tente de novo em 12 minutos.',
      }),
    );
    render(<GroupForm />);

    await user.type(field('Nome do grupo'), 'Família');
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas tentativas. Tente de novo em 12 minutos.',
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('mostra a mensagem da API num 403 e num 409', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(
        jsonResponse(403, {
          statusCode: 403,
          message: 'Só quem organiza pode alterar o grupo.',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(409, {
          statusCode: 409,
          message: 'Grupo encerrado não pode ser editado.',
        }),
      );
    render(<GroupForm group={GROUP} />);

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Só quem organiza pode alterar o grupo.',
    );

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(
      await screen.findByText('Grupo encerrado não pode ser editado.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent('Só quem organiza');
    expect(push).not.toHaveBeenCalled();
  });

  it('desabilita o botão e mostra Salvando... durante o envio, na criação e na edição', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(() => {}));

    const { unmount } = render(<GroupForm />);
    await user.type(field('Nome do grupo'), 'Família');
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Criar grupo' })).toBeNull();
    unmount();

    render(<GroupForm group={GROUP} />);
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Salvar alterações' }),
    ).toBeNull();
  });

  it('mantém os campos e mostra Não foi possível salvar. Tente de novo. num erro inesperado', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(
        jsonResponse(500, { statusCode: 500, message: 'Erro interno.' }),
      )
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<GroupForm />);

    await user.type(field('Nome do grupo'), 'Família');
    await user.type(field('Local'), 'Casa da vó');
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar. Tente de novo.',
    );
    expect(field('Nome do grupo')).toHaveValue('Família');
    expect(field('Local')).toHaveValue('Casa da vó');
    expect(screen.getByRole('button', { name: 'Criar grupo' })).toBeEnabled();

    // Falha de rede.
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar. Tente de novo.',
    );
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(field('Nome do grupo')).toHaveValue('Família');
    expect(field('Local')).toHaveValue('Casa da vó');
  });

  it('envia as datas digitadas como instantes no horário de Brasília', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(201, { ...GROUP, id: GROUP_ID }),
    );
    render(<GroupForm />);

    await user.type(field('Nome do grupo'), 'Família');
    setDate('Sorteio previsto', '2099-12-10T20:00');
    setDate('Confraternização', '2099-12-20T19:00');
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(apiFetch).toHaveBeenCalledWith(
      '/groups',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(sentBody()).toMatchObject({
      name: 'Família',
      drawScheduledAt: '2099-12-10T23:00:00.000Z',
      eventAt: '2099-12-20T22:00:00.000Z',
    });
    expect(push).toHaveBeenCalledWith(`/grupos/${GROUP_ID}`);
  });

  it('Voltar leva à página do grupo sem enviar nada', async () => {
    const user = userEvent.setup();
    render(<GroupForm group={GROUP} />);

    await user.clear(field('Nome do grupo'));
    await user.type(field('Nome do grupo'), 'Outro nome');
    const back = screen.getByRole('link', { name: 'Voltar' });
    expect(back).toHaveAttribute('href', `/grupos/${GROUP_ID}`);
    back.addEventListener('click', (event) => event.preventDefault());
    await user.click(back);

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('abre preenchido com os dados atuais do grupo', () => {
    render(<GroupForm group={GROUP} />);

    expect(field('Nome do grupo')).toHaveValue('Família Souza');
    expect(field('Recado para os participantes')).toHaveValue(
      'Traga o presente embrulhado.\nSem roupa.',
    );
    expect(field('Valor do presente (R$)')).toHaveValue('50');
    expect(field('Até (R$)')).toHaveValue('100');
    expect(field('Sorteio previsto')).toHaveValue('2099-12-10T20:00');
    expect(field('Confraternização')).toHaveValue('2099-12-20T19:00');
    expect(field('Local')).toHaveValue('Casa da vó');
    expect(
      screen.getByRole('checkbox', { name: 'Evento online' }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Exigir aprovação para entrar' }),
    ).toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    ).toBeInTheDocument();
  });

  it('abre o valor único sem o Até e salva só o valor trocado', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse(200, { ...GROUP, giftMinValue: 80, giftMaxValue: 80 }),
    );
    render(
      <GroupForm group={{ ...GROUP, giftMinValue: 50, giftMaxValue: 50 }} />,
    );

    expect(field('Valor do presente (R$)')).toHaveValue('50');
    expect(field('Até (R$)')).toHaveValue('');
    await user.clear(field('Valor do presente (R$)'));
    await user.type(field('Valor do presente (R$)'), '80');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(field('Valor do presente (R$)')).not.toHaveAccessibleDescription();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(sentBody()).toMatchObject({ giftMinValue: 80, giftMaxValue: 80 });
    expect(push).toHaveBeenCalledWith(`/grupos/${GROUP_ID}`);
  });

  it('lê o ponto como milhar e recusa decimal, vírgula e letras no valor', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse(201, GROUP));
    const { unmount } = render(<GroupForm />);
    await user.type(field('Nome do grupo'), 'Família Souza');
    await user.type(field('Valor do presente (R$)'), '1.000');
    await user.type(field('Até (R$)'), '100.000');
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(sentBody()).toMatchObject({
      giftMinValue: 1000,
      giftMaxValue: 100000,
    });
    unmount();

    for (const typed of ['50.5', '1,5', '1.50', 'dez']) {
      vi.mocked(apiFetch).mockClear();
      const { unmount: unmountCase } = render(<GroupForm />);
      await user.type(field('Nome do grupo'), 'Família Souza');
      await user.type(field('Valor do presente (R$)'), typed);
      await user.click(screen.getByRole('button', { name: 'Criar grupo' }));

      expect(field('Valor do presente (R$)')).toHaveAccessibleDescription(
        GROUP_MESSAGES.giftValue,
      );
      expect(apiFetch).not.toHaveBeenCalled();
      unmountCase();
    }
  });
});
