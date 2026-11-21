import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { type ReactNode, Suspense } from 'react';
import { AppHeader } from '@/components/app-header';
import { EmailVerificationBanner } from '@/components/email-verification-banner';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
});

export const metadata: Metadata = {
  title: 'Amigo Secreto',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={plusJakartaSans.variable}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppHeader />
          <Suspense fallback={null}>
            <EmailVerificationBanner />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
