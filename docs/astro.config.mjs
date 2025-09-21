// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
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
            { label: 'HTML Usage', slug: 'guides/html-usage' },
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
