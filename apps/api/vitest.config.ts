import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const DIST_SPECS = [
  'test/migrations.int-spec.ts',
  'test/email-test-command.int-spec.ts',
];

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    root: './',
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/**/*.int-spec.ts'],
          exclude: DIST_SPECS,
          globalSetup: ['test/global-setup.ts'],
          testTimeout: 60_000,
        },
      },
      {
        // Apagam ou compilam o dist/ (nest build com deleteOutDir): rodam um
        // de cada vez e depois dos outros projetos, para não apagar o dist/
        // de outro arquivo no meio do uso.
        test: {
          name: 'integration-dist',
          include: DIST_SPECS,
          globalSetup: ['test/global-setup.ts'],
          testTimeout: 60_000,
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
