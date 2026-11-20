import type { EmailBlock, EmailMessage } from '../email/email.types.js';

type Recipient = { to: string; name: string };
type LinkEmail = Recipient & { token: string; webUrl: string };

function paragraph(text: string): EmailBlock {
  return { type: 'paragraph', text };
}

function button(label: string, url: string): EmailBlock {
  return { type: 'button', label, url };
}

function greeting(name: string): EmailBlock {
  return paragraph(`Olá, ${name}.`);
}

function siteUrl(
  webUrl: string,
  path: string,
  query: Record<string, string> = {},
): string {
  const url = new URL(path, webUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.href;
}

export function emailVerificationEmail({
  to,
  name,
  token,
  webUrl,
}: LinkEmail): EmailMessage {
  return {
    to,
    subject: 'Confirme seu e-mail no Amigo Secreto',
    blocks: [
      greeting(name),
      paragraph('Confirme seu e-mail para usar sua conta no Amigo Secreto.'),
      button(
        'Confirmar e-mail',
        siteUrl(webUrl, '/confirmar-email', { token }),
      ),
      paragraph(
        'O link vale por 7 dias. Se você não criou esta conta, ignore este e-mail.',
      ),
    ],
  };
}

// Vai no lugar da confirmação quando o e-mail do cadastro já tem conta, para
// a resposta do cadastro não revelar quem tem conta.
export function accountExistsEmail({
  to,
  name,
  webUrl,
}: Recipient & { webUrl: string }): EmailMessage {
  return {
    to,
    subject: 'Você já tem uma conta no Amigo Secreto',
    blocks: [
      greeting(name),
      paragraph(
        'Alguém tentou criar uma conta no Amigo Secreto com este e-mail, mas você já tem uma.',
      ),
      button('Entrar', siteUrl(webUrl, '/entrar')),
      paragraph('Se esqueceu a senha, crie uma nova.'),
      button('Redefinir senha', siteUrl(webUrl, '/esqueci-a-senha')),
      paragraph('Se não foi você, ignore este e-mail.'),
    ],
  };
}

export function passwordResetEmail({
  to,
  name,
  token,
  webUrl,
}: LinkEmail): EmailMessage {
  return {
    to,
    subject: 'Redefina sua senha do Amigo Secreto',
    blocks: [
      greeting(name),
      paragraph('Recebemos um pedido para redefinir a senha da sua conta.'),
      button('Redefinir senha', siteUrl(webUrl, '/redefinir-senha', { token })),
      paragraph(
        'O link vale por 1 hora. Se você não pediu, ignore este e-mail: sua senha continua a mesma.',
      ),
    ],
  };
}

export function passwordChangedEmail({ to, name }: Recipient): EmailMessage {
  return {
    to,
    subject: 'Sua senha do Amigo Secreto foi alterada',
    blocks: [
      greeting(name),
      paragraph('A senha da sua conta no Amigo Secreto foi alterada.'),
      paragraph(
        'Se não foi você, use "Esqueci a senha" na página de login para criar uma nova.',
      ),
    ],
  };
}

// Vai para o endereço novo; o atual recebe o aviso de emailChangeNoticeEmail.
export function newEmailConfirmationEmail({
  to,
  name,
  token,
  webUrl,
}: LinkEmail): EmailMessage {
  return {
    to,
    subject: 'Confirme seu novo e-mail no Amigo Secreto',
    blocks: [
      greeting(name),
      paragraph(
        'Confirme este e-mail para usá-lo na sua conta do Amigo Secreto.',
      ),
      button(
        'Confirmar novo e-mail',
        siteUrl(webUrl, '/confirmar-email', { token, tipo: 'troca' }),
      ),
      paragraph(
        'O link vale por 7 dias. Até lá, você continua entrando com o e-mail atual. Se não foi você, ignore este e-mail.',
      ),
    ],
  };
}

export function emailChangeNoticeEmail({
  to,
  name,
  newEmail,
}: Recipient & { newEmail: string }): EmailMessage {
  return {
    to,
    subject: 'Pedido de troca de e-mail no Amigo Secreto',
    blocks: [
      greeting(name),
      paragraph(
        `Recebemos um pedido para trocar o e-mail da sua conta para ${newEmail}. A troca só vale depois que o novo endereço for confirmado.`,
      ),
      paragraph('Se não foi você, troque sua senha no perfil.'),
    ],
  };
}

export function googleLinkedEmail({ to, name }: Recipient): EmailMessage {
  return {
    to,
    subject: 'Conta Google vinculada ao Amigo Secreto',
    blocks: [
      greeting(name),
      paragraph(
        'Sua conta do Amigo Secreto foi vinculada à sua conta Google. Agora você também pode entrar com o Google.',
      ),
      paragraph('Se não reconhece este acesso, troque sua senha no perfil.'),
    ],
  };
}
