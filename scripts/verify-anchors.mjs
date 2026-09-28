// Every internal link in dist/ must reach a page that exists and, when it has a fragment,
// an element with that id on that page. Run after `pnpm build`.
import fs from 'node:fs';
import path from 'node:path';
import { fromHtml } from 'hast-util-from-html';
import { selectAll } from 'hast-util-select';

const DIST = 'dist';
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'pagefind' && entry.name !== '_astro') yield* walk(full); }
    else if (entry.name.endsWith('.html')) yield full;
  }
}
const pages = new Map();
const links = [];
for (const file of walk(DIST)) {
  const url = `/${path.relative(DIST, file).split(path.sep).join('/').replace(/index\.html$/, '')}`;
  const tree = fromHtml(fs.readFileSync(file, 'utf8'));
  pages.set(url, new Set(selectAll('[id]', tree).map((e) => String(e.properties.id))));
  for (const a of selectAll('a[href]', tree)) links.push({ from: url, href: String(a.properties.href) });
}
let broken = 0;
for (const { from, href } of links) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue; // external
  const [pathname, hash] = href.split('#');
  const target = pathname === '' ? from : new URL(pathname, `http://site${from}`).pathname;
  const ids = pages.get(target);
  if (!ids) { broken += 1; console.error(`✗ ${from} → ${href}: no page ${target}`); continue; }
  if (hash && !ids.has(decodeURIComponent(hash))) { broken += 1; console.error(`✗ ${from} → ${href}: no #${hash} on ${target}`); }
}
console.log(`${links.length} links checked across ${pages.size} pages, ${broken} broken`);
process.exit(broken > 0 ? 1 : 0);
