import { render, screen } from '@testing-library/react';
import type { ApiStatus } from '@/lib/api-status';
import HomePage from './page';

const { getApiStatus } = vi.hoisted(() => ({
  getApiStatus: vi.fn<() => Promise<ApiStatus>>(),
}));

vi.mock('@/lib/api-status', () => ({ getApiStatus }));
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

describe('HomePage', () => {
  it('mostra API online quando o status é online', async () => {
    getApiStatus.mockResolvedValue('online');

    render(await HomePage());

    expect(screen.getByText('API online')).toBeInTheDocument();
    expect(screen.queryByText('API indisponível')).not.toBeInTheDocument();
  });

  it('mostra API indisponível quando o status é unavailable', async () => {
    getApiStatus.mockResolvedValue('unavailable');

    render(await HomePage());

    expect(screen.getByText('API indisponível')).toBeInTheDocument();
    expect(screen.queryByText('API online')).not.toBeInTheDocument();
  });
});
