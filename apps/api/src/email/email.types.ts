export type EmailBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'button'; label: string; url: string };

export type EmailMessage = {
  to: string;
  subject: string;
  // Texto que o cliente mostra na prévia da caixa de entrada; sem ele, a
  // prévia é o começo do corpo.
  preview?: string;
  blocks: EmailBlock[];
};

export type RenderedEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};
