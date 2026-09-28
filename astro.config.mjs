import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  trailingSlash: 'always',
  // The source documents use straight quotes; smartypants would rewrite them and break fidelity.
  markdown: { smartypants: false },
});
