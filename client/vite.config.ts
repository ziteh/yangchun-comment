import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WontonComment',
      formats: ['es', 'umd'],
      fileName: (format) => `wonton-comment.${format}.js`,
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        exports: 'named',
      },
    },
    minify: 'terser',
    sourcemap: true,
  },
});
