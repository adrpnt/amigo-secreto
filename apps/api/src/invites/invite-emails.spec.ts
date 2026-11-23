import { renderEmail } from '../email/email-layout.js';
import {
  approvedEmail,
  emailInviteEmail,
  joinRequestEmail,
  memberJoinedEmail,
  memberLeftEmail,
  ownershipEmail,
  rejectedEmail,
  removedEmail,
} from './invite-emails.js';

const WEB_URL = 'https://amigo.exemplo.com';
const GROUP_ID = '0b9f7a52-3c1e-4d8a-9f61-2a4e5c7d8b90';
const TO = 'caio@exemplo.com';

function message(subject: string, paragraphs: string[], button: object) {
  return {
    to: TO,
    subject,
    blocks: [
      ...paragraphs.map((text) => ({ type: 'paragraph', text })),
      { type: 'button', ...button },
    ],
  };
}

describe('e-mails do convite', () => {
  it('convite por e-mail tem o assunto, o texto e o botão Ver convite para /convite/{código}', () => {
    expect(
      emailInviteEmail({
        to: TO,
        groupName: 'Família 2026',
        organizerName: 'Ana',
        inviteCode: 'ab23cd45ef',
        webUrl: WEB_URL,
      }),
    ).toEqual(
      message(
        'Ana convidou você para o amigo secreto Família 2026',
        [
          'Olá.',
          'Ana convidou você para participar do amigo secreto Família 2026. Para entrar, você vai precisar de uma conta no Amigo Secreto.',
        ],
        { label: 'Ver convite', url: `${WEB_URL}/convite/ab23cd45ef` },
      ),
    );
  });

  it('pedido de entrada tem o assunto, o texto e o botão Ver pedidos', () => {
    expect(
      joinRequestEmail({
        to: TO,
        name: 'Ana',
        personName: 'Bia',
        groupName: 'Família 2026',
        groupId: GROUP_ID,
        webUrl: WEB_URL,
      }),
    ).toEqual(
      message(
        'Bia pediu para entrar em Família 2026',
        [
          'Olá, Ana.',
          'Bia pediu para entrar no grupo Família 2026 no Amigo Secreto.',
        ],
        {
          label: 'Ver pedidos',
          url: `${WEB_URL}/grupos/${GROUP_ID}/participantes`,
        },
      ),
    );
  });

  it('entrada sem aprovação tem o assunto, o texto e o botão Ver participantes', () => {
    expect(
      memberJoinedEmail({
        to: TO,
        name: 'Ana',
        personName: 'Bia',
        groupName: 'Família 2026',
        groupId: GROUP_ID,
        webUrl: WEB_URL,
      }),
    ).toEqual(
      message(
        'Bia entrou em Família 2026',
        ['Olá, Ana.', 'Bia entrou no grupo Família 2026 pelo link de convite.'],
        {
          label: 'Ver participantes',
          url: `${WEB_URL}/grupos/${GROUP_ID}/participantes`,
        },
      ),
    );
  });

  it('entrada aprovada tem o assunto, o texto e o botão Ver grupo', () => {
    expect(
      approvedEmail({
        to: TO,
        name: 'Bia',
        organizerName: 'Ana',
        groupName: 'Família 2026',
        groupId: GROUP_ID,
        webUrl: WEB_URL,
      }),
    ).toEqual(
      message(
        'Você entrou no grupo Família 2026',
        [
          'Olá, Bia.',
          'Ana aprovou sua entrada no grupo Família 2026 no Amigo Secreto.',
        ],
        { label: 'Ver grupo', url: `${WEB_URL}/grupos/${GROUP_ID}` },
      ),
    );
  });

  it('entrada recusada tem o assunto, o texto e o botão Ver meus grupos', () => {
    expect(
      rejectedEmail({
        to: TO,
        name: 'Bia',
        organizerName: 'Ana',
        groupName: 'Família 2026',
        webUrl: WEB_URL,
      }),
    ).toEqual(
      message(
        'Sua entrada em Família 2026 não foi aprovada',
        [
          'Olá, Bia.',
          'Ana não aprovou sua entrada no grupo Família 2026 no Amigo Secreto.',
        ],
        { label: 'Ver meus grupos', url: `${WEB_URL}/grupos` },
      ),
    );
  });

  it('remoção tem o assunto, o texto e o botão Ver meus grupos', () => {
    expect(
      removedEmail({
        to: TO,
        name: 'Bia',
        organizerName: 'Ana',
        groupName: 'Família 2026',
        webUrl: WEB_URL,
      }),
    ).toEqual(
      message(
        'Ana removeu você de Família 2026',
        [
          'Olá, Bia.',
          'Ana removeu você do grupo Família 2026 no Amigo Secreto.',
        ],
        { label: 'Ver meus grupos', url: `${WEB_URL}/grupos` },
      ),
    );
  });

  it('saída tem o assunto, o texto e o botão Ver participantes', () => {
    expect(
      memberLeftEmail({
        to: TO,
        name: 'Ana',
        personName: 'Bia',
        groupName: 'Família 2026',
        groupId: GROUP_ID,
        webUrl: WEB_URL,
      }),
    ).toEqual(
      message(
        'Bia saiu de Família 2026',
        ['Olá, Ana.', 'Bia saiu do grupo Família 2026 no Amigo Secreto.'],
        {
          label: 'Ver participantes',
          url: `${WEB_URL}/grupos/${GROUP_ID}/participantes`,
        },
      ),
    );
  });

  it('nova organização tem o assunto, o texto e o botão Ver grupo', () => {
    expect(
      ownershipEmail({
        to: TO,
        name: 'Bia',
        previousOrganizerName: 'Ana',
        groupName: 'Família 2026',
        groupId: GROUP_ID,
        webUrl: WEB_URL,
      }),
    ).toEqual(
      message(
        'Agora você organiza Família 2026',
        [
          'Olá, Bia.',
          'Ana passou para você a organização do grupo Família 2026 no Amigo Secreto.',
        ],
        { label: 'Ver grupo', url: `${WEB_URL}/grupos/${GROUP_ID}` },
      ),
    );
  });

  it('mostram nomes de pessoa e de grupo com marcação HTML como texto', () => {
    const groupName = '<b>Natal</b> & <script>alert(1)</script>';
    const person = '<i>Bia</i>';
    const base = { to: TO, groupName, webUrl: WEB_URL, groupId: GROUP_ID };

    const messages = [
      emailInviteEmail({
        ...base,
        organizerName: person,
        inviteCode: 'ab23cd45ef',
      }),
      joinRequestEmail({ ...base, name: 'Ana', personName: person }),
      memberJoinedEmail({ ...base, name: 'Ana', personName: person }),
      approvedEmail({ ...base, name: 'Caio', organizerName: person }),
      rejectedEmail({ ...base, name: 'Caio', organizerName: person }),
      removedEmail({ ...base, name: 'Caio', organizerName: person }),
      memberLeftEmail({ ...base, name: 'Ana', personName: person }),
      ownershipEmail({ ...base, name: 'Caio', previousOrganizerName: person }),
    ];

    for (const email of messages) {
      const rendered = renderEmail(email);

      expect(rendered.subject).toContain(groupName);
      expect(rendered.text).toContain(groupName);
      expect(rendered.text).toContain(person);
      expect(rendered.html).toContain(
        '&lt;b&gt;Natal&lt;/b&gt; &amp; &lt;script&gt;alert(1)&lt;/script&gt;',
      );
      expect(rendered.html).toContain('&lt;i&gt;Bia&lt;/i&gt;');
      expect(rendered.html).not.toContain('<b>Natal</b>');
      expect(rendered.html).not.toContain('<script>');
      expect(rendered.html).not.toContain('<i>Bia</i>');
    }
  });
});
