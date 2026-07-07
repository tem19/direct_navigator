import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve('src/core'),
      '@db': resolve('src/db'),
      '@direct-api': resolve('src/direct-api'),
      '@sync': resolve('src/sync'),
      '@preload': resolve('src/preload')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true
  }
})
