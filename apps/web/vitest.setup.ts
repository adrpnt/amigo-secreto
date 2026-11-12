import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// O jsdom não implementa matchMedia, que o next-themes usa para ler o tema do sistema.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList,
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.className = '';
});
