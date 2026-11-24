import type { InviteView } from '@amigo-secreto/shared';
import { inviteMetadata } from './invite-metadata';

const INVITE: InviteView = {
  groupName: 'Família Souza',
  organizerName: 'Ana Souza',
  groupStatus: 'OPEN',
  requiresApproval: false,
  viewer: 'anonymous',
  groupId: null,
};

const PREVIEW_IMAGE = { url: '/og/convite.png', width: 1200, height: 630 };

const GENERIC = {
  title: 'Convite do Amigo Secreto',
  description: 'Sorteio, lista de desejos e mensagens secretas.',
  openGraph: {
    title: 'Convite do Amigo Secreto',
    description: 'Sorteio, lista de desejos e mensagens secretas.',
    images: [PREVIEW_IMAGE],
  },
};

describe('inviteMetadata', () => {
  it('código válido usa Convite: {grupo}, a descrição e a imagem /og/convite.png de 1200 x 630', () => {
    expect(inviteMetadata(INVITE)).toEqual({
      title: 'Convite: Família Souza',
      description: 'Ana Souza convidou você para o amigo secreto.',
      openGraph: {
        title: 'Convite: Família Souza',
        description: 'Ana Souza convidou você para o amigo secreto.',
        images: [PREVIEW_IMAGE],
      },
    });
  });

  it('código inválido usa Convite do Amigo Secreto sem dados de grupo', () => {
    expect(inviteMetadata(null)).toEqual(GENERIC);
  });

  it('429 do robô monta o preview sem dados de grupo', () => {
    expect(
      inviteMetadata({
        tooMany: 'Muitas tentativas. Tente de novo em 1 minuto.',
      }),
    ).toEqual(GENERIC);
  });

  it('mantém marcação HTML do nome como texto nas meta tags', () => {
    const metadata = inviteMetadata({
      ...INVITE,
      groupName: '<b>Família</b> & cia',
      organizerName: '<i>Ana</i>',
    });

    expect(metadata.title).toBe('Convite: <b>Família</b> & cia');
    expect(metadata.openGraph?.title).toBe('Convite: <b>Família</b> & cia');
    expect(metadata.description).toBe(
      '<i>Ana</i> convidou você para o amigo secreto.',
    );
  });
});
