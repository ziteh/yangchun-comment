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
  esbuild: {
    target: 'es2022',
  },
  build: {
    target: 'es2022',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'YangchunComment',
      formats: ['es', 'umd'],
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
          // Inline workers
          inlineDynamicImports: false,
        },
        {
          format: 'umd',
          entryFileNames: 'yangchun-comment.umd.js',
          name: 'YangchunComment',
          exports: 'named',
          globals: {},
          assetFileNames,
          // Inline workers
          inlineDynamicImports: false,
        },
      ],
    },
    minify: 'terser',
    sourcemap: true,
  },
  worker: {
    format: 'es',
    plugins: () => [terser()],
  },
});
