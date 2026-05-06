import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
    alias: {
      // RN -> web shims
      'react-native': 'react-native-web',
      'react-native-linear-gradient': resolve(__dirname, 'src/stubs/linear-gradient.tsx'),
      'react-native-svg': resolve(__dirname, 'src/stubs/react-native-svg.tsx'),
      // safe-area-context has web exports but needs the right entry
      'react-native-safe-area-context': resolve(__dirname, 'src/stubs/safe-area-context.tsx'),

      // Path aliases (mirrors jest moduleNameMapper)
      '@services': resolve(__dirname, 'src/services'),
      '@components': resolve(__dirname, 'src/components'),
      '@screens': resolve(__dirname, 'src/screens'),
      '@core': resolve(__dirname, 'src/core'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@stores': resolve(__dirname, 'src/stores'),
    },
  },
  define: {
    __DEV__: JSON.stringify(false),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-native-web'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    include: ['react-native-web'],
    esbuildOptions: {
      jsx: 'automatic',
      resolveExtensions: ['.web.js', '.web.jsx', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx'],
    },
  },
});
