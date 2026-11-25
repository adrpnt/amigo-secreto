import type {
  BusinessEventAttributes,
  BusinessEventsService,
} from '../observability/business-events.service.js';
import { renderEmail } from './email-layout.js';
import { EmailSender } from './email-sender.js';
import type { EmailTransport } from './email-transport.js';
import type { EmailMessage, RenderedEmail } from './email.types.js';

const MESSAGE: EmailMessage = {
  to: 'ana@exemplo.com',
  subject: 'O sorteio de Família foi feito',
  blocks: [
    {
      type: 'paragraph',
      text: 'Bruno fez o sorteio do amigo secreto Família.',
    },
    { type: 'button', label: 'Ver no site', url: 'https://exemplo.com/x' },
  ],
};

function setup(failure?: Error) {
  const sent: { email: RenderedEmail; key: string }[] = [];
  const events: { event: string; attributes?: BusinessEventAttributes }[] = [];
  const transport: EmailTransport = {
    send: (email, key) => {
      if (failure) return Promise.reject(failure);
      sent.push({ email, key });
      return Promise.resolve();
    },
  };
  const businessEvents = {
    record: (event: string, attributes?: BusinessEventAttributes) => {
      events.push({ event, attributes });
    },
  } as BusinessEventsService;
  return { sender: new EmailSender(transport, businessEvents), sent, events };
}

describe('EmailSender', () => {
  it('envia o e-mail montado com a chave recebida e emite email.sent', async () => {
    const { sender, sent, events } = setup();

    await sender.send(MESSAGE, 'job-1');

    expect(sent).toEqual([{ email: renderEmail(MESSAGE), key: 'email/job-1' }]);
    expect(sent[0].email).toMatchObject({
      to: 'ana@exemplo.com',
      subject: 'O sorteio de Família foi feito',
    });
    expect(events).toEqual([
      { event: 'email.sent', attributes: { jobId: 'job-1' } },
    ]);
  });

  it('não emite email.sent quando o transporte falha', async () => {
    const failure = new Error('transporte fora do ar');
    const { sender, events } = setup(failure);

    await expect(sender.send(MESSAGE, 'job-1')).rejects.toBe(failure);
    expect(events).toEqual([]);
  });
});
