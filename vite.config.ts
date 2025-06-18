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
            target: 'http://localhost/architex-axis-management-suite/backend', // Adjust to your local PHP server path
            changeOrigin: true,
            secure: false,
          },
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'components': path.resolve(__dirname, './components'),
          'types': path.resolve(__dirname, './types'),
          'apiService': path.resolve(__dirname, './apiService'),
          'constants': path.resolve(__dirname, './constants')
        }
      }
    };
});
