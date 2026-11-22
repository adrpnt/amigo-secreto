import type { GroupDetail } from '@amigo-secreto/shared';
import { editRedirect } from './edit-redirect';

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
  isOrganizer: true,
  closedAt: null,
  createdAt: '2026-11-21T12:00:00.000Z',
};

const GROUP_PAGE = `/grupos/${GROUP.id}`;

describe('editRedirect', () => {
  it('leva à página do grupo quem não organiza e o grupo ENCERRADO', () => {
    expect(editRedirect({ ...GROUP, isOrganizer: false })).toBe(GROUP_PAGE);
    expect(
      editRedirect({ ...GROUP, isOrganizer: false, status: 'DRAWN' }),
    ).toBe(GROUP_PAGE);
    expect(
      editRedirect({
        ...GROUP,
        status: 'CLOSED',
        closedAt: '2026-12-21T12:00:00.000Z',
      }),
    ).toBe(GROUP_PAGE);
    expect(editRedirect(GROUP)).toBeNull();
    expect(editRedirect({ ...GROUP, status: 'DRAWN' })).toBeNull();
  });
});
