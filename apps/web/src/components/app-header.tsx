import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-glass-border bg-glass py-2 pr-2 pl-4 backdrop-blur-md md:pl-6 no-backdrop-blur:border-border no-backdrop-blur:bg-card reduced-transparency:border-border reduced-transparency:bg-card reduced-transparency:backdrop-blur-none">
      <Link
        href="/"
        className="flex-1 rounded-sm text-lg font-extrabold tracking-[-0.02em] text-foreground no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Amigo Secreto
      </Link>
      <ThemeToggle />
    </header>
  );
}
