import { randomUUID } from 'node:crypto';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import { EmailService } from '../src/email/email.service.js';
import type { EmailMessage } from '../src/email/email.types.js';
import { Job } from '../src/jobs/job.entity.js';

class RollbackSignal extends Error {}

describe('EmailService', () => {
  let app: INestApplicationContext;
  let emails: EmailService;
  let dataSource: DataSource;

  beforeAll(async () => {
    // O ConfigModule valida o ambiente quando o módulo é importado.
    vi.stubEnv('DATABASE_URL', inject('databaseUrl'));
    const { EmailFixtureModule } =
      await import('./fixtures/email-fixture.module.js');
    app = await NestFactory.createApplicationContext(EmailFixtureModule, {
      logger: false,
    });
    emails = app.get(EmailService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  const messageWith = (
    overrides: Partial<EmailMessage> = {},
  ): EmailMessage => ({
    to: 'ana@example.com',
    subject: `Convite ${randomUUID()}`,
    blocks: [
      { type: 'paragraph', text: 'Você foi convidada para o grupo Família.' },
      { type: 'button', label: 'Entrar', url: 'https://exemplo.com/c/1' },
    ],
    ...overrides,
  });

  const jobsWithSubject = (subject: string) =>
    dataSource
      .getRepository(Job)
      .createQueryBuilder('job')
      .where("job.payload->>'subject' = :subject", { subject })
      .getMany();

  it('enfileira um job email.send dentro da transação informada', async () => {
    const message = messageWith({
      blocks: [
        { type: 'paragraph', text: 'Seu grupo foi sorteado.' },
        { type: 'button', label: 'Ver', url: 'http://localhost:3000/g/1' },
      ],
    });
    let visibleBeforeCommit: Job | null = null;

    const before = new Date();
    const enqueued = await dataSource.transaction(async (manager) => {
      const job = await emails.enqueue(message, { manager });
      visibleBeforeCommit = await dataSource
        .getRepository(Job)
        .findOneBy({ id: job.id });
      return job;
    });
    const after = new Date();

    expect(visibleBeforeCommit).toBeNull();
    const jobs = await jobsWithSubject(message.subject);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      id: enqueued.id,
      type: 'email.send',
      payload: message,
      status: 'PENDING',
      attempts: 0,
    });
    expect(jobs[0]?.runAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(jobs[0]?.runAt.getTime()).toBeLessThanOrEqual(after.getTime());

    const rolledBack = messageWith();
    await expect(
      dataSource.transaction(async (manager) => {
        await emails.enqueue(rolledBack, { manager });
        throw new RollbackSignal();
      }),
    ).rejects.toBeInstanceOf(RollbackSignal);
    expect(await jobsWithSubject(rolledBack.subject)).toHaveLength(0);
  });

  it('repassa o runAt informado ao job', async () => {
    const message = messageWith();
    const runAt = new Date('2030-12-20T09:00:00.000Z');

    await emails.enqueue(message, { runAt });

    const jobs = await jobsWithSubject(message.subject);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.type).toBe('email.send');
    expect(jobs[0]?.runAt.toISOString()).toBe('2030-12-20T09:00:00.000Z');
  });

  it('lança erro e não grava job com destinatário inválido', async () => {
    for (const to of ['', 'ana', 'ana@', '@example.com', 'ana example.com']) {
      const message = messageWith({ to });

      const error: unknown = await emails
        .enqueue(message)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Destinatário de e-mail inválido.');
      expect(await jobsWithSubject(message.subject)).toHaveLength(0);
    }
  });

  it('lança erro e não grava job com URL de botão que não é http ou https', async () => {
    const urls = [
      '/grupos/1',
      'exemplo.com/grupos/1',
      'javascript:alert(1)',
      'ftp://exemplo.com/arquivo',
      'mailto:ana@example.com',
    ];

    for (const url of urls) {
      const message = messageWith({
        blocks: [
          { type: 'paragraph', text: 'Olá.' },
          { type: 'button', label: 'Abrir', url },
        ],
      });

      await expect(emails.enqueue(message)).rejects.toThrow(
        'URL de botão inválida.',
      );
      expect(await jobsWithSubject(message.subject)).toHaveLength(0);
    }
  });

  it('enqueueMany grava um job email.send por mensagem', async () => {
    const messages = [
      messageWith({ to: 'ana@example.com' }),
      messageWith({ to: 'bia@example.com' }),
      messageWith({ to: 'caio@example.com' }),
    ];

    const before = new Date();
    await dataSource.transaction(async (manager) => {
      await emails.enqueueMany(messages, { manager });
    });
    const after = new Date();

    for (const message of messages) {
      const jobs = await jobsWithSubject(message.subject);
      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toMatchObject({
        type: 'email.send',
        payload: message,
        status: 'PENDING',
        attempts: 0,
      });
      expect(jobs[0]?.runAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(jobs[0]?.runAt.getTime()).toBeLessThanOrEqual(after.getTime());
    }
  });

  it('enqueueMany recusa a lista inteira quando um destinatário é inválido', async () => {
    const withBadRecipient = [
      messageWith({ to: 'ana@example.com' }),
      messageWith({ to: 'ana example.com' }),
      messageWith({ to: 'bia@example.com' }),
    ];

    await expect(emails.enqueueMany(withBadRecipient)).rejects.toThrow(
      'Destinatário de e-mail inválido.',
    );
    for (const message of withBadRecipient) {
      expect(await jobsWithSubject(message.subject)).toHaveLength(0);
    }

    const withBadUrl = [
      messageWith(),
      messageWith({
        blocks: [{ type: 'button', label: 'Abrir', url: '/grupos/1' }],
      }),
    ];

    await expect(emails.enqueueMany(withBadUrl)).rejects.toThrow(
      'URL de botão inválida.',
    );
    for (const message of withBadUrl) {
      expect(await jobsWithSubject(message.subject)).toHaveLength(0);
    }
  });
});
