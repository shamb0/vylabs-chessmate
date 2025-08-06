/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
    
    // Include integration/e2e tests but EXCLUDE Playwright tests
    include: ['src/tests/integration/**/*.spec.{ts,tsx}', 'src/tests/e2e/**/*.spec.{ts,tsx}'],
    
    // Explicitly exclude Playwright tests and other non-vitest files
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/tests/unit/**',
      //  KEY FIX: Exclude Playwright tests
      '**/*.spec.pw.{ts,tsx}',
      '**/*.pw.spec.{ts,tsx}',
      // Also exclude common Playwright patterns
      '**/*.playwright.{ts,tsx}',
      '**/playwright/**',
    ],
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@chrisoakman/chessboard2': path.resolve(
        __dirname,
        'node_modules/@chrisoakman/chessboard2/dist/chessboard2.min.js'
      ),
    },
  },
})
