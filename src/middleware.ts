import { defineMiddleware } from 'astro:middleware';
import { loadSiteData } from './lib/data';
import { enhanceHtml } from './lib/enhance';
import { buildRegistry } from './lib/registry';

// Runs for every page, in dev and while prerendering the static build.
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const registry = buildRegistry(await loadSiteData());
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(enhanceHtml(await response.text(), registry), { status: response.status, headers });
});
