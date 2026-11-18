export type EmailBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'button'; label: string; url: string };

export type EmailMessage = {
  to: string;
  subject: string;
  blocks: EmailBlock[];
};

export type RenderedEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};
