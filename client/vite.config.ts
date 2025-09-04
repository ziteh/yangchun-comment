import { defineConfig } from 'vite';
import { resolve } from 'path';
import terser from '@rollup/plugin-terser';

const assetFileNames = (assetInfo) => {
  const names = assetInfo.names;
  if (names.some((n) => n.endsWith('.css'))) {
    return 'yangchun-comment.css';
  }
  return '[name][extname]';
};

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'YangchunComment',
    },
    rollupOptions: {
      external: [],
      output: [
        {
          format: 'es',
          entryFileNames: 'yangchun-comment.es.js',
          exports: 'named',
          plugins: [terser()],
          assetFileNames,
        },
        {
          format: 'umd',
          entryFileNames: 'yangchun-comment.umd.js',
          name: 'YangchunComment',
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
