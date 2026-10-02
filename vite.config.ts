import dsv from '@rollup/plugin-dsv';
// https://vitejs.dev/config/
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  base: '/chess-game-review/',
  plugins: [react(), tailwindcss(), dsv()],
  server: {
    open: true,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');

          if (!normalizedId.includes('/node_modules/'))
            return;

          if (/\/(?:react|react-dom|scheduler)\//.test(normalizedId))
            return 'react-vendor';

          if (
            /\/(?:@heroui|@react-aria|@react-stately|@internationalized)\//.test(normalizedId)
            || /\/(?:react-aria|react-stately)\//.test(normalizedId)
          ) {
            return 'ui-vendor';
          }

          if (/\/(?:framer-motion|motion-dom|motion-utils)\//.test(normalizedId))
            return 'motion-vendor';

          if (/\/(?:react-hook-form|tailwind-merge|tailwind-variants)\//.test(normalizedId))
            return 'forms-vendor';

          if (normalizedId.includes('/@tanstack/'))
            return 'query-vendor';

          if (normalizedId.includes('/chess.js/'))
            return 'chess-vendor';
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      exclude: [
        ...configDefaults.coverage.exclude!,
        '**/{ignore,test}',
        '**/{commitlint,postcss,tailwind}.config.*',
      ],
    },
  },
});
