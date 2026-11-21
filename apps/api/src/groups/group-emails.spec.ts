import { renderEmail } from '../email/email-layout.js';
import { groupClosedEmail, groupDeletedEmail } from './group-emails.js';

const WEB_URL = 'https://amigo.exemplo.com';
const GROUP_ID = '0b9f7a52-3c1e-4d8a-9f61-2a4e5c7d8b90';

describe('e-mails de grupo', () => {
  it('aviso de exclusão tem o assunto, o texto e o botão Ver meus grupos', () => {
    expect(
      groupDeletedEmail({
        to: 'bia@exemplo.com',
        name: 'Bia',
        groupName: 'Família 2026',
        organizerName: 'Ana',
        webUrl: WEB_URL,
      }),
    ).toEqual({
      to: 'bia@exemplo.com',
      subject: 'O grupo Família 2026 foi excluído',
      blocks: [
        { type: 'paragraph', text: 'Olá, Bia.' },
        {
          type: 'paragraph',
          text: 'Ana excluiu o grupo Família 2026 no Amigo Secreto. As informações do grupo foram apagadas.',
        },
        { type: 'button', label: 'Ver meus grupos', url: `${WEB_URL}/grupos` },
      ],
    });
  });

  it('aviso de encerramento tem o assunto, o texto e o botão Ver grupo', () => {
    expect(
      groupClosedEmail({
        to: 'bia@exemplo.com',
        name: 'Bia',
        groupName: 'Família 2026',
        organizerName: 'Ana',
        groupId: GROUP_ID,
        webUrl: WEB_URL,
      }),
    ).toEqual({
      to: 'bia@exemplo.com',
      subject: 'O grupo Família 2026 foi encerrado',
      blocks: [
        { type: 'paragraph', text: 'Olá, Bia.' },
        {
          type: 'paragraph',
          text: 'Ana encerrou o grupo Família 2026 no Amigo Secreto. Ele continua em Meus grupos, na seção Encerrados.',
        },
        {
          type: 'button',
          label: 'Ver grupo',
          url: `${WEB_URL}/grupos/${GROUP_ID}`,
        },
      ],
    });
  });

  it('mostram o nome do grupo com marcação HTML como texto', () => {
    const groupName = '<b>Natal</b> & <script>alert(1)</script>';
    const notice = {
      to: 'bia@exemplo.com',
      name: 'Bia',
      groupName,
      organizerName: 'Ana',
      webUrl: WEB_URL,
    };

    for (const message of [
      groupDeletedEmail(notice),
      groupClosedEmail({ ...notice, groupId: GROUP_ID }),
    ]) {
      const rendered = renderEmail(message);

      expect(rendered.subject).toContain(groupName);
      expect(rendered.text).toContain(groupName);
      expect(rendered.html).toContain(
        '&lt;b&gt;Natal&lt;/b&gt; &amp; &lt;script&gt;alert(1)&lt;/script&gt;',
      );
      expect(rendered.html).not.toContain('<b>Natal</b>');
      expect(rendered.html).not.toContain('<script>');
    }
  });
});
