// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  vite: {
    esbuild: {
      target: 'es2022',
    },
  },
  integrations: [
    starlight({
      title: 'Yang Chun Comment',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/ziteh/yangchun-comment' },
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Getting Started', slug: 'guides/get-started' },
            { label: 'Development', slug: 'guides/development' },
          ],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: '',
          },
        },
        {
          tag: 'link',
          attrs: {
            href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Roboto+Mono:ital,wght@0,400,600;1,400,600&display=swap',
            rel: 'stylesheet',
          },
        },
      ],
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        'zh-tw': { label: '繁體中文', lang: 'zh-TW' },
      },
      customCss: ['./src/styles/custom.css'],
      expressiveCode: {
        // https://expressive-code.com/guides/themes/
        themes: ['one-dark-pro', 'catppuccin-latte'],
        defaultProps: {
          wrap: false,
          frame: 'none',
        },
        styleOverrides: {
          codeFontFamily:
            "'Roboto Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        },
      },
    }),
  ],
});
