import { defineConfig } from 'vite';
import { resolve } from 'path';
import terser from '@rollup/plugin-terser';

const assetFileNames = (assetInfo) => {
  const names = assetInfo.names;
  if (names.some((n) => n.endsWith('.css'))) {
    return 'wonton-comment.css';
  }
  return '[name][extname]';
};

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WontonComment',
    },
    rollupOptions: {
      external: [],
      output: [
        {
          format: 'es',
          entryFileNames: 'wonton-comment.es.js',
          exports: 'named',
          plugins: [terser()],
          assetFileNames,
        },
        {
          format: 'umd',
          entryFileNames: 'wonton-comment.umd.js',
          name: 'WontonComment',
          exports: 'named',
          globals: {},
          assetFileNames,
        },
      ],
    },
    minify: 'terser',
    sourcemap: true,
  },
});
