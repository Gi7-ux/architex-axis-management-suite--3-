import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      build: {
        outDir: 'public_html/dist',
        assetsDir: 'assets',
      },
      server: {
        proxy: {
          '/backend': {
            target: 'http://localhost:8000',
            changeOrigin: true,
            secure: false,
            rewrite: (reqPath) => reqPath.replace(/^\/backend/, '')
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'components': path.resolve(__dirname, './components'),
          'contexts': path.resolve(__dirname, './contexts'),
          'types': path.resolve(__dirname, './types'),
          'apiService': path.resolve(__dirname, './apiService'),
          'constants': path.resolve(__dirname, './constants')
        }
      },
    };
});
