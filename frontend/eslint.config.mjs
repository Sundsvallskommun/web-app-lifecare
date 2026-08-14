import js from '@eslint/js';
import next from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier/flat';

const config = [
  {
    ignores: ['cypress/**', 'coverage/**', '.jest/**', '**/*.test.*'],
  },
  js.configs.recommended,
  ...next,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': [
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
