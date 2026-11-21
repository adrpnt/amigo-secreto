import { TERMS_VERSION } from '@amigo-secreto/shared';
import type { ReactNode } from 'react';

// Página provisória de documento legal; o texto final vem com as páginas
// públicas do site.
export function LegalDocument({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
      <article className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-h1">{title}</h1>
          <p className="text-body-sm text-muted-foreground">
            Versão {TERMS_VERSION}
          </p>
        </header>
        {children}
      </article>
    </main>
  );
}
