import type { GroupSummary } from '@amigo-secreto/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyGroupsView } from './my-groups-view';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

function summary(
  name: string,
  overrides: Partial<GroupSummary> = {},
): GroupSummary {
  return {
    id: crypto.randomUUID(),
    name,
    status: 'OPEN',
    participantCount: 1,
    isOrganizer: false,
    drawScheduledAt: null,
    eventAt: null,
    createdAt: '2026-11-21T12:00:00.000Z',
    ...overrides,
  };
}

function section(name: string) {
  return screen.getByRole('region', { name });
}

function cardNames(region: HTMLElement): string[] {
  return within(region)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '');
}

beforeEach(() => {
  refresh.mockReset();
});

describe('MyGroupsView', () => {
  it('lista Ativos e Encerrados na ordem recebida', () => {
    render(
      <MyGroupsView
        groups={{
          active: [
            summary('Família Souza'),
            summary('Firma', { status: 'DRAWN' }),
          ],
          closed: [summary('Faculdade', { status: 'CLOSED' })],
        }}
      />,
    );

    expect(cardNames(section('Ativos'))).toEqual(['Família Souza', 'Firma']);
    expect(cardNames(section('Encerrados'))).toEqual(['Faculdade']);
    expect(screen.getByRole('link', { name: 'Criar grupo' })).toHaveAttribute(
      'href',
      '/grupos/novo',
    );
  });

  it('mostra o estado vazio com Criar grupo', () => {
    render(<MyGroupsView groups={{ active: [], closed: [] }} />);

    expect(
      screen.getByText('Você ainda não participa de nenhum grupo.'),
    ).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Criar grupo' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/grupos/novo');
    expect(screen.queryByRole('region', { name: 'Ativos' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Encerrados' })).toBeNull();
  });

  it('omite Encerrados sem grupo encerrado', () => {
    render(
      <MyGroupsView
        groups={{ active: [summary('Família Souza')], closed: [] }}
      />,
    );

    expect(cardNames(section('Ativos'))).toEqual(['Família Souza']);
    expect(screen.queryByRole('region', { name: 'Encerrados' })).toBeNull();
    expect(screen.queryByText('Encerrados')).toBeNull();
  });

  it('mostra Nenhum grupo ativo. só com encerrados', () => {
    render(
      <MyGroupsView
        groups={{
          active: [],
          closed: [summary('Faculdade', { status: 'CLOSED' })],
        }}
      />,
    );

    expect(
      within(section('Ativos')).getByText('Nenhum grupo ativo.'),
    ).toBeInTheDocument();
    expect(cardNames(section('Encerrados'))).toEqual(['Faculdade']);
    expect(
      screen.queryByText('Você ainda não participa de nenhum grupo.'),
    ).toBeNull();
  });

  it('mostra o erro com Tentar de novo, que recarrega', async () => {
    render(<MyGroupsView groups={null} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar seus grupos.',
    );
    expect(screen.queryByRole('region', { name: 'Ativos' })).toBeNull();
    expect(
      screen.queryByText('Você ainda não participa de nenhum grupo.'),
    ).toBeNull();
    expect(refresh).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    );

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
