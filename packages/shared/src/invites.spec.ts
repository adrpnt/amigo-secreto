import { describe, expect, it } from 'vitest';
import {
  INVITE_MESSAGES,
  isEmailAddress,
  parseInviteEmails,
  validateInviteEmails,
} from './invites.js';

function distinctEmails(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `pessoa${index}@x.com`);
}

describe('parseInviteEmails', () => {
  it('separa por vírgula, ponto e vírgula, espaço e quebra de linha', () => {
    expect(
      parseInviteEmails('a@x.com,b@x.com;c@x.com d@x.com\ne@x.com\r\nf@x.com'),
    ).toEqual({
      emails: [
        'a@x.com',
        'b@x.com',
        'c@x.com',
        'd@x.com',
        'e@x.com',
        'f@x.com',
      ],
      invalid: [],
    });
  });

  it('conta uma vez os repetidos sem diferenciar maiúsculas', () => {
    expect(
      parseInviteEmails('Ana@X.com, ana@x.com; ANA@x.COM bia@x.com'),
    ).toEqual({ emails: ['ana@x.com', 'bia@x.com'], invalid: [] });
    expect(parseInviteEmails('Joao@, joao@, JOAO@')).toEqual({
      emails: [],
      invalid: ['Joao@'],
    });
  });

  it('descarta separadores repetidos e pontas vazias', () => {
    expect(parseInviteEmails(' ,; a@x.com ,,;;\n\n  b@x.com ; , \n')).toEqual({
      emails: ['a@x.com', 'b@x.com'],
      invalid: [],
    });
    expect(parseInviteEmails(' ,;\n ')).toEqual({ emails: [], invalid: [] });
  });
});

describe('validateInviteEmails', () => {
  it('recusa o campo vazio com Informe pelo menos um e-mail.', () => {
    const message = 'Informe pelo menos um e-mail.';
    expect(INVITE_MESSAGES.empty).toBe(message);
    expect(validateInviteEmails('')).toEqual({
      emails: [],
      fields: { emails: message },
    });
    expect(validateInviteEmails(' ,; \n ')).toEqual({
      emails: [],
      fields: { emails: message },
    });
  });

  it('lista os endereços inválidos em Confira estes e-mails:', () => {
    expect(
      validateInviteEmails('ana@x.com, Joao@, maria.com; joao@').fields,
    ).toEqual({ emails: 'Confira estes e-mails: Joao@, maria.com' });

    // Com inválidos e mais de 20 ao mesmo tempo, vale a lista dos inválidos.
    const tooManyWithInvalid = [...distinctEmails(21), 'maria.com'].join(', ');
    expect(validateInviteEmails(tooManyWithInvalid).fields).toEqual({
      emails: 'Confira estes e-mails: maria.com',
    });
  });

  it('aceita 20 endereços distintos e recusa 21 com Envie no máximo 20 e-mails por vez.', () => {
    const message = 'Envie no máximo 20 e-mails por vez.';
    expect(INVITE_MESSAGES.tooMany).toBe(message);

    const twenty = distinctEmails(20);
    expect(validateInviteEmails(twenty.join(', '))).toEqual({
      emails: twenty,
      fields: {},
    });
    expect(validateInviteEmails(distinctEmails(21).join(', ')).fields).toEqual({
      emails: message,
    });
  });

  it('conta 20 distintos quando há repetidos além deles', () => {
    const twenty = distinctEmails(20);
    const repeated = twenty.slice(0, 5).map((email) => email.toUpperCase());
    expect(validateInviteEmails([...twenty, ...repeated].join('\n'))).toEqual({
      emails: twenty,
      fields: {},
    });
  });
});

describe('isEmailAddress', () => {
  it('aceita endereço comum e recusa sem arroba, sem ponto no domínio, com espaço ou com mais de 254 caracteres', () => {
    const domain = '@exemplo.com';
    expect(isEmailAddress('ana@exemplo.com')).toBe(true);
    expect(isEmailAddress('a'.repeat(254 - domain.length) + domain)).toBe(true);

    expect(isEmailAddress('anaexemplo.com')).toBe(false);
    expect(isEmailAddress('ana@exemplo')).toBe(false);
    expect(isEmailAddress('ana silva@exemplo.com')).toBe(false);
    expect(isEmailAddress('a'.repeat(255 - domain.length) + domain)).toBe(
      false,
    );
  });
});
