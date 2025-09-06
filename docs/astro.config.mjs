// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeNova from 'starlight-theme-nova';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Yangchun Comment',
      plugins: [starlightThemeNova()],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/ziteh/wonton-comment' },
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'HTML Usage', slug: 'guides/html-usage' },
            { label: 'Example Guide', slug: 'guides/example' },
          ],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
    }),
  ],
});
