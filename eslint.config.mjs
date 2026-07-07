import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'out/**',
      'out-types/**',
      'dist/**',
      'release/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ]
    }
  },
  // Renderer: React + строгий запрет на импорт main-only модулей.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',
      // Границы слоёв: renderer общается с main ТОЛЬКО через window.api.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'electron', message: 'renderer не импортирует electron — используй window.api' },
            {
              name: 'better-sqlite3',
              message: 'БД доступна только из main — используй window.api'
            }
          ],
          patterns: [
            {
              group: ['node:*', 'electron', 'electron/*', 'better-sqlite3'],
              message: 'renderer не импортирует electron/better-sqlite3/node:* — только window.api'
            },
            {
              group: ['@db/*', '@direct-api/*', '@sync/*', '@main/*'],
              message: 'renderer не импортирует слои main напрямую — только window.api и @core'
            }
          ]
        }
      ]
    }
  },
  // core: доменная логика без Electron и SQL.
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'electron/*', 'better-sqlite3'],
              message: 'core не знает про Electron и SQL'
            }
          ]
        }
      ]
    }
  },
  // Конфиги и node-скрипты.
  {
    files: ['**/*.config.{js,ts}', '*.config.{js,ts}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
)
