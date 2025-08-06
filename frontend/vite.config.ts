/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  
  
  return {
    plugins: [react(), tsconfigPaths(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      fs: {
        strict: false,
        allow: ['..', '/usr/src/app/src'],
      },
      watch: { usePolling: true },
      allowedHosts: ['frontend', 'localhost', '.local', 'frontend-dev'],
      hmr: {
        protocol: 'ws',
        host: 'frontend-dev',
        port: 3000,
      },
      cors: true,
      logLevel: 'info',
      configureServer(server) {
        server.middlewares.use('/healthz', (req, res) => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok' }));
        });
      },
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
  }
})