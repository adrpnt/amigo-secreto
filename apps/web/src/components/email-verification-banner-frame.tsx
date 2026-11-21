'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// A /confirmar-email já oferece o reenvio; ali a faixa repetiria o botão.
const HIDDEN_ON = ['/confirmar-email'];

export function EmailVerificationBannerFrame({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;
  return children;
}
