import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));
const { compilerOptions } = JSON.parse(readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8'));

const base = resolve(root, compilerOptions.baseUrl ?? '.');

const aliases = Object.entries<string[]>(compilerOptions.paths).map(([key, [target]]) =>
  key.endsWith('/*')
    ? { find: new RegExp(`^${key.slice(0, -2)}/(.*)$`), replacement: `${resolve(base, target.slice(0, -2))}/$1` }
    : { find: new RegExp(`^${key}$`), replacement: resolve(base, target) },
);

export default defineConfig({
  resolve: { alias: aliases },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    setupFiles: ['src/tests/setup-env.ts'],
  },
});
