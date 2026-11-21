import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './confirm-dialog';

const TITLE = 'Excluir o grupo Família?';
const DESCRIPTION =
  'O grupo e tudo o que há nele serão apagados para todos os participantes. Não dá para desfazer.';

// Abre a confirmação e mostra, fora dela, se a pessoa confirmou.
function Harness() {
  const [open, setOpen] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <>
      <p>{confirmed ? 'Confirmado' : 'Não confirmado'}</p>
      <ConfirmDialog
        open={open}
        title={TITLE}
        description={DESCRIPTION}
        confirmLabel="Excluir grupo"
        cancelLabel="Manter grupo"
        onConfirm={() => {
          setConfirmed(true);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

async function expectClosedWithoutConfirming() {
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByText('Não confirmado')).toBeInTheDocument();
}

describe('ConfirmDialog', () => {
  it('abre com o título, o texto e os dois botões', async () => {
    render(<Harness />);

    const dialog = await screen.findByRole('dialog', { name: TITLE });
    expect(dialog).toHaveAccessibleDescription(DESCRIPTION);
    expect(
      screen.getByRole('button', { name: 'Excluir grupo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Manter grupo' }),
    ).toBeInTheDocument();
  });

  it('põe o foco em Manter grupo e prende o Tab', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const dialog = await screen.findByRole('dialog', { name: TITLE });
    const keep = screen.getByRole('button', { name: 'Manter grupo' });
    const confirm = screen.getByRole('button', { name: 'Excluir grupo' });
    await waitFor(() => expect(keep).toHaveFocus());

    // A guarda de foco do Base UI devolve o foco ao diálogo logo depois do Tab.
    await user.tab();
    await waitFor(() => expect(confirm).toHaveFocus());
    await user.tab();
    await waitFor(() => expect(keep).toHaveFocus());
    await user.tab({ shift: true });
    await waitFor(() => expect(confirm).toHaveFocus());
    await user.tab({ shift: true });
    await waitFor(() => expect(keep).toHaveFocus());
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('fecha sem confirmar com Manter grupo, Esc e toque fora', async () => {
    const user = userEvent.setup();

    const { unmount } = render(<Harness />);
    await screen.findByRole('dialog', { name: TITLE });
    await user.click(screen.getByRole('button', { name: 'Manter grupo' }));
    await expectClosedWithoutConfirming();
    unmount();

    const second = render(<Harness />);
    await screen.findByRole('dialog', { name: TITLE });
    await user.keyboard('{Escape}');
    await expectClosedWithoutConfirming();
    second.unmount();

    render(<Harness />);
    await screen.findByRole('dialog', { name: TITLE });
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();
    await user.click(overlay as HTMLElement);
    await expectClosedWithoutConfirming();
  });
});
