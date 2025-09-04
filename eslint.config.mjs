// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.wrangler/**', '*.config.mjs'],
    extends: [eslint.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic],
    rules: {
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  eslintConfigPrettier,
);
