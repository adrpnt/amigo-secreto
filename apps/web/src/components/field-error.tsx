import { CircleAlert } from 'lucide-react';

// Mensagem abaixo do campo, ligada a ele por aria-describedby.
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      className="flex items-center gap-1.5 text-body-sm text-destructive"
    >
      <CircleAlert aria-hidden className="size-4 shrink-0" />
      {message}
    </p>
  );
}
