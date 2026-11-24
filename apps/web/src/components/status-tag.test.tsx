import { render, screen } from '@testing-library/react';
import { StatusTag } from './status-tag';

describe('StatusTag', () => {
  it('escreve ABERTO, SORTEADO e ENCERRADO com ícone', () => {
    render(
      <>
        <StatusTag status="OPEN" />
        <StatusTag status="DRAWN" />
        <StatusTag status="CLOSED" />
      </>,
    );

    for (const word of ['ABERTO', 'SORTEADO', 'ENCERRADO']) {
      const tag = screen.getByText(word);
      expect(tag).toHaveTextContent(new RegExp(`^${word}$`));
      expect(tag.querySelector('svg')).not.toBeNull();
    }
  });

  it('escreve Pendente e Recusado com ícone', () => {
    render(
      <>
        <StatusTag status="PENDING" />
        <StatusTag status="REJECTED" />
      </>,
    );

    for (const word of ['Pendente', 'Recusado']) {
      const tag = screen.getByText(word);
      expect(tag).toHaveTextContent(new RegExp(`^${word}$`));
      expect(tag.querySelector('svg')).not.toBeNull();
    }
  });
});
