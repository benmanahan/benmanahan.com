import { defineConfig } from 'astro/config';

// The portfolio is served from the root of its custom domain.
export default defineConfig({
  site: process.env.SITE_URL || 'https://benmanahan.com',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
