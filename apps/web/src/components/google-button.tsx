'use client';

import { Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const GOOGLE_START_PATH = '/api/auth/google/start';
const COPIED_NOTICE_MS = 3_000;

type GoogleButtonProps = {
  googleEnabled: boolean;
  inAppBrowser: boolean;
  next?: string;
};

// "G" colorido do Google, como pedem as regras de marca para botões de login.
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

// No navegador interno dos apps o Google recusa o login; a pessoa copia o
// endereço e abre no navegador do celular.
function InAppBrowserGuidance() {
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const fallbackField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!fallbackUrl) return;
    fallbackField.current?.focus();
    fallbackField.current?.select();
  }, [fallbackUrl]);

  async function copyLink() {
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setFallbackUrl(url);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Alert variant="info">
        <Info aria-hidden />
        <AlertDescription>
          Para entrar com Google, abra esta página no navegador do celular.
        </AlertDescription>
      </Alert>
      <Button variant="secondary" onClick={() => void copyLink()}>
        Copiar link
      </Button>
      {fallbackUrl && (
        <Input
          ref={fallbackField}
          readOnly
          value={fallbackUrl}
          aria-label="Endereço desta página"
        />
      )}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4"
      >
        {copied && (
          <p className="rounded-md bg-foreground px-4 py-2 text-body-sm text-background shadow-md">
            Link copiado.
          </p>
        )}
      </div>
    </div>
  );
}

export function GoogleButton({
  googleEnabled,
  inAppBrowser,
  next,
}: GoogleButtonProps) {
  if (!googleEnabled) return null;
  if (inAppBrowser) return <InAppBrowserGuidance />;

  const href = next
    ? `${GOOGLE_START_PATH}?next=${encodeURIComponent(next)}`
    : GOOGLE_START_PATH;
  return (
    <a
      href={href}
      className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2')}
    >
      <GoogleLogo />
      Entrar com Google
    </a>
  );
}
