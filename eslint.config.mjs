import js from '@eslint/js';
import expo from 'eslint-config-expo/flat.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.agents/**', '.claude/**', '.factory/**', 'templates/**', 'node_modules/**', '**/dist/**', 'coverage/**', '**/worker-configuration.d.ts'] },
  js.configs.recommended,
  ...expo,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'import/no-named-as-default-member': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: ['workers/**/*.ts'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
);
