// Checks that the migrated idea pages carry the same visible text as the original HTML
// deliverables (read from git at the pre-migration commit), that <pre> blocks survive byte
// for byte, and that question detail matches doc 01. Run after `pnpm build`.
// Accepted wording changes go in scripts/fidelity-allowlist.json as {page, from, to, reason},
// applied to the original text before comparing.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { fromHtml } from 'hast-util-from-html';
import { select, selectAll } from 'hast-util-select';
import YAML from 'yaml';

const BASE = '6c8dd77';
const PAGES = [
  { original: 'docs/02-uc1-solution-architecture.html', slug: 'uc1-solution-architecture' },
  { original: 'docs/03-uc2-content-model.html', slug: 'uc2-content-model' },
];
const BLOCK = new Set(['p', 'li', 'td', 'th', 'tr', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'table',
  'thead', 'tbody', 'pre', 'ul', 'ol', 'br', 'header', 'footer', 'figure', 'figcaption', 'blockquote', 'nav', 'main']);

const git = (path) => execSync(`git show ${BASE}:${path}`, { encoding: 'utf8', maxBuffer: 1 << 26 });
const allow = JSON.parse(fs.readFileSync('scripts/fidelity-allowlist.json', 'utf8'));
let failures = 0;
const fail = (message) => { failures += 1; console.error(`✗ ${message}`); };

/** Visible text with a space at every block boundary, whitespace collapsed. */
function visibleText(node) {
  const out = [];
  (function walk(n) {
    if (n.type === 'text') { out.push(n.value); return; }
    const block = n.type === 'element' && BLOCK.has(n.tagName);
    if (block) out.push(' ');
    (n.children ?? []).forEach(walk);
    if (block) out.push(' ');
  })(node);
  return out.join('').replace(/\s+/g, ' ').trim();
}
const rawText = (node) => { let s = ''; (function walk(n) { if (n.type === 'text') s += n.value; (n.children ?? []).forEach(walk); })(node); return s; };
const applyAllow = (slug, text) => allow.filter((a) => a.page === slug).reduce((t, a) => t.split(a.from).join(a.to), text);

for (const { original, slug } of PAGES) {
  const before = fromHtml(git(original));
  const after = fromHtml(fs.readFileSync(`dist/ideas/${slug}/index.html`, 'utf8'));
  const blocks = (tree) => [select('header.mast', tree), ...selectAll('main section', tree), select('main footer', tree)];
  const a = blocks(before);
  const b = blocks(after);
  if (a.length !== b.length) { fail(`${slug}: ${a.length} blocks in the original, ${b.length} migrated`); continue; }
  a.forEach((node, i) => {
    const label = `${slug} ${node?.properties?.id ?? node?.tagName ?? i}`;
    if (!node || !b[i]) { fail(`${label}: block missing`); return; }
    const was = applyAllow(slug, visibleText(node));
    const now = visibleText(b[i]);
    if (was === now) { console.log(`✓ ${label}`); return; }
    let k = 0;
    while (was[k] === now[k]) k += 1;
    fail(`${label} differs at character ${k}\n    original: …${was.slice(Math.max(0, k - 60), k + 80)}\n    migrated: …${now.slice(Math.max(0, k - 60), k + 80)}`);
  });
  const preBefore = selectAll('main pre', before);
  const preAfter = selectAll('main pre', after);
  if (preBefore.length !== preAfter.length) fail(`${slug}: ${preBefore.length} pre blocks in the original, ${preAfter.length} migrated`);
  preBefore.forEach((pre, i) => {
    if (preAfter[i] && rawText(pre) === rawText(preAfter[i])) console.log(`✓ ${slug} pre ${i + 1} exact`);
    else fail(`${slug} pre ${i + 1}: whitespace or text differs`);
  });
}

const doc01 = fromHtml(git('docs/01-pilot-backlog.html'));
const questions = YAML.parse(fs.readFileSync('data/questions.yaml', 'utf8'));
for (const block of selectAll('#questions div.q', doc01)) {
  const id = visibleText(select('.qid', block));
  const q = questions.find((x) => x.id === id);
  if (!q) { fail(`${id}: missing from data/questions.yaml`); continue; }
  const why = select('.why', block);
  if (q.detail !== visibleText(select('.qb', block))) fail(`${id}: detail differs from doc 01`);
  else if ((why ? visibleText(why) : undefined) !== q.why) fail(`${id}: why differs from doc 01`);
  else console.log(`✓ ${id} detail`);
}

if (failures > 0) { console.error(`\n${failures} fidelity problem(s)`); process.exit(1); }
console.log('\nfidelity: ok');
