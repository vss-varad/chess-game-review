import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

describe('vite runtime config', () => {
  test('binds dev and preview servers to a reachable host and includes COEP/COOP headers', () => {
    const configText = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');

    expect(configText).toContain('host: \'0.0.0.0\'');
    expect(configText).toContain('\'Cross-Origin-Embedder-Policy\': \'require-corp\'');
    expect(configText).toContain('\'Cross-Origin-Opener-Policy\': \'same-origin\'');
    expect(configText).toContain('preview: {');
  });
});
