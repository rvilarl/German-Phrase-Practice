import tsParser from '@typescript-eslint/parser';
import i18nextPlugin from 'eslint-plugin-i18next';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

const sharedLanguageOptions = {
  parser: tsParser,
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  globals: {
    ...globals.browser,
    ...globals.node,
  },
};

const literalRuleOptions = {
  markupOnly: false,
  ignoreAttributePatterns: ['^aria-', '^data-', '^role$', '^testId$', '^key$'],
  ignorePropertyNames: ['label', 'title', 'ariaLabel'],
  ignoreCalleeNames: ['t', 'toast', 'console', 'setError'],
};

export default [
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: sharedLanguageOptions,
    plugins: {
      i18next: i18nextPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'i18next/no-literal-string': ['warn', literalRuleOptions],
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: [
      'components/Header.tsx',
      'components/SettingsModal.tsx',
      'src/contexts/languageContext.tsx',
    ],
    languageOptions: sharedLanguageOptions,
    plugins: {
      i18next: i18nextPlugin,
    },
    rules: {
      'i18next/no-literal-string': ['error', literalRuleOptions],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**', 'scripts/**', 'src/i18n/**'],
    rules: {
      'i18next/no-literal-string': 'off',
    },
  },
];
