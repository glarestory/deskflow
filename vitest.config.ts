import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'src/renderer/**/*.{ts,tsx}',
        'src/main/**/*.ts',
        'src/preload/**/*.ts',
      ],
      exclude: [
        'src/renderer/**/*.test.{ts,tsx}',
        'src/renderer/__tests__/**',
        'src/main/**/*.test.ts',
        'src/preload/**/*.test.ts',
        'src/**/*.d.ts',
        'src/renderer/main.tsx',
        'src/renderer/types/**',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer'),
    },
  },
})
