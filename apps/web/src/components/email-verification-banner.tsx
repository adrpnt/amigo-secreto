import type { SessionUser } from '@amigo-secreto/shared';
import { MailWarning } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { EmailVerificationBannerFrame } from './email-verification-banner-frame';
import { ResendVerification } from './resend-verification';

// Faixa abaixo do cabeçalho para quem entrou sem confirmar o e-mail. Sem
// sessão legível (API fora do ar), a faixa não aparece e a página segue.
export async function EmailVerificationBanner() {
  let user: SessionUser | null;
  try {
    user = await getCurrentUser();
  } catch {
    return null;
  }
  if (!user || user.emailVerified) return null;

  return (
    <EmailVerificationBannerFrame>
      <div className="border-b border-border bg-warning-subtle text-body-sm text-warning-subtle-foreground">
        <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:px-6">
          <p className="flex flex-1 items-start gap-2">
            <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
            Confirme seu e-mail: enviamos um link para {user.email}.
          </p>
          <ResendVerification variant="outline" />
        </div>
      </div>
    </EmailVerificationBannerFrame>
  );
}
