/**
 * ESLint configuration for the project.
 *
 * See https://eslint.style and https://typescript-eslint.io for additional linting options.
 */
// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  {
    ignores: [
      '.vscode-test',
      'out',
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      'arrow-parens': ['error', 'always'],
      'curly': 'warn',
      'no-trailing-spaces': 'error',
      '@stylistic/comma-dangle': ["error", "always-multiline"],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'always'],
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          'selector': 'import',
          'format': ['camelCase', 'PascalCase']
        }
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any' : 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_.*'
        }
      ],
    }
  }
);