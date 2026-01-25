// CRITICAL
export default {
  entry: ['src/main.ts', 'scripts/**/*.ts'],
  project: ['src/**/*.ts', 'scripts/**/*.ts'],
  test: ['src/**/*.test.ts'],
  ignore: [
    'bun.lockb',
    'node_modules/**',
    'dist/**',
    'runtime/**',
    '.husky/**',
  ],
  ignoreDependencies: [
    '@types/*',
  ],
};
