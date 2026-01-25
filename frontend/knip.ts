// CRITICAL
import { defineConfig } from 'knip';

export default defineConfig({
  entry: ['src/app/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
  project: ['src/**/*.{ts,tsx}'],
  test: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  ignore: [
    '.next/**',
    'node_modules/**',
    '.husky/**',
    'playwright-report/**',
  ],
  ignoreDependencies: [
    '@types/*',
    'eslint-config-next',
    'tailwindcss',
  ],
});
