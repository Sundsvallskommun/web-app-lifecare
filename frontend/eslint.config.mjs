import js from '@eslint/js';
import next from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

const config = [
  {
    ignores: ['cypress/**', 'coverage/**', '.jest/**', '**/*.test.*', '**/*.cy.*'],
  },
  js.configs.recommended,
  ...next,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  prettier,
];

export default config;
