import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression > TSAsExpression',
          message:
            'Double casts (a as X as Y / as unknown as Z) are banned. Use toJsonInput from ./json.',
        },
      ],
    },
  },
  // The canonical Prisma dev-global singleton pattern + the toJsonInput helper
  // use chained casts internally — these are the only allowed double-casts in the codebase.
  {
    files: ['src/index.ts', 'src/json.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    ignores: ['src/generated/**'],
  },
);
