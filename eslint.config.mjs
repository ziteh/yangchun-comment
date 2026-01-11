// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.wrangler/**', '**/*.astro/**'],
  },
  {
    extends: [eslint.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic],
    rules: {
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',

      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      // TODO: eslint-plugin-security?
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  eslintConfigPrettier,
);
