import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { withBase } from '../lib/paths';
export const GET: APIRoute = async ({ site }) => {
  const projects = await getCollection('projects', ({ data }) => !data.placeholder);
  const paths = ['', ...projects.map(({ data }) => `projects/${data.slug}/`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${new URL(withBase(path), site)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
