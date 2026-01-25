// CRITICAL
import { defineConfig } from 'knip';

export default defineConfig({
  entry: ['src/main.ts'],
  project: ['src/**/*.ts'],
  test: ['src/**/*.test.ts'],
  ignore: [
    'vllm-studio',
    'node_modules/**',
    '.husky/**',
  ],
  ignoreDependencies: [
    '@types/*',
  ],
});
