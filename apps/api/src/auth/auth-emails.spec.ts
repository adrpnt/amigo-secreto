import {
  accountExistsEmail,
  emailChangeNoticeEmail,
  emailVerificationEmail,
  googleLinkedEmail,
  newEmailConfirmationEmail,
  passwordChangedEmail,
  passwordResetEmail,
} from './auth-emails.js';

const WEB_URL = 'https://amigo.exemplo.com';
const TOKEN = 'Abc-_123xyz';

describe('e-mails da conta', () => {
  it('confirmação tem o assunto "Confirme seu e-mail no Amigo Secreto" e o botão "Confirmar e-mail" com o link', () => {
    expect(
      emailVerificationEmail({
        to: 'ana@exemplo.com',
        name: 'Ana',
        token: TOKEN,
        webUrl: WEB_URL,
      }),
    ).toEqual({
      to: 'ana@exemplo.com',
      subject: 'Confirme seu e-mail no Amigo Secreto',
      blocks: [
        { type: 'paragraph', text: 'Olá, Ana.' },
        {
          type: 'paragraph',
          text: 'Confirme seu e-mail para usar sua conta no Amigo Secreto.',
        },
        {
          type: 'button',
          label: 'Confirmar e-mail',
          url: `${WEB_URL}/confirmar-email?token=${TOKEN}`,
        },
        {
          type: 'paragraph',
          text: 'O link vale por 7 dias. Se você não criou esta conta, ignore este e-mail.',
        },
      ],
    });
  });

  it('já tem conta tem o assunto "Você já tem uma conta no Amigo Secreto" e os botões "Entrar" e "Redefinir senha"', () => {
    expect(
      accountExistsEmail({
        to: 'ana@exemplo.com',
        name: 'Ana',
        webUrl: WEB_URL,
      }),
    ).toEqual({
      to: 'ana@exemplo.com',
      subject: 'Você já tem uma conta no Amigo Secreto',
      blocks: [
        { type: 'paragraph', text: 'Olá, Ana.' },
        {
          type: 'paragraph',
          text: 'Alguém tentou criar uma conta no Amigo Secreto com este e-mail, mas você já tem uma.',
        },
        { type: 'button', label: 'Entrar', url: `${WEB_URL}/entrar` },
        { type: 'paragraph', text: 'Se esqueceu a senha, crie uma nova.' },
        {
          type: 'button',
          label: 'Redefinir senha',
          url: `${WEB_URL}/esqueci-a-senha`,
        },
        { type: 'paragraph', text: 'Se não foi você, ignore este e-mail.' },
      ],
    });
  });

  it('recuperação tem o assunto "Redefina sua senha do Amigo Secreto" e o botão "Redefinir senha" com o link', () => {
    expect(
      passwordResetEmail({
        to: 'ana@exemplo.com',
        name: 'Ana',
        token: TOKEN,
        webUrl: WEB_URL,
      }),
    ).toEqual({
      to: 'ana@exemplo.com',
      subject: 'Redefina sua senha do Amigo Secreto',
      blocks: [
        { type: 'paragraph', text: 'Olá, Ana.' },
        {
          type: 'paragraph',
          text: 'Recebemos um pedido para redefinir a senha da sua conta.',
        },
        {
          type: 'button',
          label: 'Redefinir senha',
          url: `${WEB_URL}/redefinir-senha?token=${TOKEN}`,
        },
        {
          type: 'paragraph',
          text: 'O link vale por 1 hora. Se você não pediu, ignore este e-mail: sua senha continua a mesma.',
        },
      ],
    });
  });

  it('senha alterada tem o assunto "Sua senha do Amigo Secreto foi alterada"', () => {
    expect(
      passwordChangedEmail({ to: 'ana@exemplo.com', name: 'Ana' }),
    ).toEqual({
      to: 'ana@exemplo.com',
      subject: 'Sua senha do Amigo Secreto foi alterada',
      blocks: [
        { type: 'paragraph', text: 'Olá, Ana.' },
        {
          type: 'paragraph',
          text: 'A senha da sua conta no Amigo Secreto foi alterada.',
        },
        {
          type: 'paragraph',
          text: 'Se não foi você, use "Esqueci a senha" na página de login para criar uma nova.',
        },
      ],
    });
  });

  it('novo e-mail tem o assunto "Confirme seu novo e-mail no Amigo Secreto" e o botão "Confirmar novo e-mail" com o link', () => {
    expect(
      newEmailConfirmationEmail({
        to: 'ana.nova@exemplo.com',
        name: 'Ana',
        token: TOKEN,
        webUrl: WEB_URL,
      }),
    ).toEqual({
      to: 'ana.nova@exemplo.com',
      subject: 'Confirme seu novo e-mail no Amigo Secreto',
      blocks: [
        { type: 'paragraph', text: 'Olá, Ana.' },
        {
          type: 'paragraph',
          text: 'Confirme este e-mail para usá-lo na sua conta do Amigo Secreto.',
        },
        {
          type: 'button',
          label: 'Confirmar novo e-mail',
          url: `${WEB_URL}/confirmar-email?token=${TOKEN}&tipo=troca`,
        },
        {
          type: 'paragraph',
          text: 'O link vale por 7 dias. Até lá, você continua entrando com o e-mail atual. Se não foi você, ignore este e-mail.',
        },
      ],
    });
  });

  it('e-mail antigo tem o assunto "Pedido de troca de e-mail no Amigo Secreto"', () => {
    expect(
      emailChangeNoticeEmail({
        to: 'ana@exemplo.com',
        name: 'Ana',
        newEmail: 'ana.nova@exemplo.com',
      }),
    ).toEqual({
      to: 'ana@exemplo.com',
      subject: 'Pedido de troca de e-mail no Amigo Secreto',
      blocks: [
        { type: 'paragraph', text: 'Olá, Ana.' },
        {
          type: 'paragraph',
          text: 'Recebemos um pedido para trocar o e-mail da sua conta para ana.nova@exemplo.com. A troca só vale depois que o novo endereço for confirmado.',
        },
        {
          type: 'paragraph',
          text: 'Se não foi você, troque sua senha no perfil.',
        },
      ],
    });
  });

  it('Google vinculado tem o assunto "Conta Google vinculada ao Amigo Secreto"', () => {
    expect(googleLinkedEmail({ to: 'ana@exemplo.com', name: 'Ana' })).toEqual({
      to: 'ana@exemplo.com',
      subject: 'Conta Google vinculada ao Amigo Secreto',
      blocks: [
        { type: 'paragraph', text: 'Olá, Ana.' },
        {
          type: 'paragraph',
          text: 'Sua conta do Amigo Secreto foi vinculada à sua conta Google. Agora você também pode entrar com o Google.',
        },
        {
          type: 'paragraph',
          text: 'Se não reconhece este acesso, troque sua senha no perfil.',
        },
      ],
    });
  });
});
