import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { type ReactNode, Suspense } from 'react';
import { AppHeader } from '@/components/app-header';
import { EmailVerificationBanner } from '@/components/email-verification-banner';
import { ThemeProvider } from '@/components/theme-provider';
import { siteMetadata } from '@/lib/site-url';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Amigo Secreto', ...(await siteMetadata()) };
}

// Aplica o tema salvo antes do primeiro quadro. O script do next-themes fica
// no <body> e pode rodar depois de um script assíncrono do <head>, quando o
// navegador já desenhou um quadro no tema do sistema. Mesma chave, padrão e
// atributo do ThemeProvider abaixo.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('theme')||'system';if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={plusJakartaSans.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
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
