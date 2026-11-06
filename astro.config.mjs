import { defineConfig } from 'astro/config';

// Default to the repository's Pages URL; no custom domain or DNS change.
// SITE_URL=https://benmanahan.com BASE_PATH=/ switches to a custom domain.
export default defineConfig({
  site: process.env.SITE_URL || 'https://benmanahan.github.io',
  base: process.env.BASE_PATH || '/benmanahan.com',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
