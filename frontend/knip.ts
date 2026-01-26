// CRITICAL
// Frontend uses extensive barrel exports (index.ts) which knip doesn't handle well.
// This config is deliberately lenient to avoid false positives.
const config = {
  entry: ['src/app/**/*.{ts,tsx}'],
  project: ['src/**/*.{ts,tsx}'],
  ignore: [
    '.next/**',
    'node_modules/**',
    '.husky/**',
    'playwright-report/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    // Barrel/index files export for external use
    '**/index.ts',
    // Components - all may be used dynamically
    'src/components/**',
    // Libraries - exported for various uses
    'src/lib/**',
    // Store exports
    'src/store/**',
  ],
  ignoreDependencies: [
    // Ignore all @types packages
    '@types/*',
    // Next.js config
    'eslint-config-next',
    'tailwindcss',
    // AI SDK providers
    '@ai-sdk/openai-compatible',
    '@ai-sdk/react',
    'ai',
    // Markdown processing
    // PostCSS
    'postcss',
    '@tailwindcss/postcss',
    // Dev tooling
    'husky',
    'jscpd',
    'lint-staged',
    'depcheck',
    'prettier',
  ],
  ignoreBinaries: ['husky', 'knip', 'jscpd'],
  ignoreExportsUsedInFile: true,
};

export default config;
