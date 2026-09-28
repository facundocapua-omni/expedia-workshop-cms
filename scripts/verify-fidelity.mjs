// Checks that every block of the original HTML deliverables (read from git at the
// pre-migration commit) is still on the built site, on whichever page it now lives, that
// <pre> blocks survive byte for byte, and that question detail matches doc 01.
// Run after `pnpm build`.
//
// A migrated block carries data-origin="<doc>:<section id>:<piece>". The piece is the block's
// index among the original section's children after its <h2> (for a ROW_PIECES section, its
// table row, with the head row as 0), or "*" for the whole section body. Mastheads and
// footers do not move, and are compared on their own idea page.
//
// Accepted changes go in scripts/fidelity-allowlist.json, keyed by origin:
//   {origin, from, to, reason}       applied to the original text before comparing
//   {origin, retire: true, reason}   a piece deliberately taken off the site
// List the pieces of a section with: node scripts/verify-fidelity.mjs --pieces uc1:risks
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fromHtml } from 'hast-util-from-html';
import { select, selectAll } from 'hast-util-select';
import YAML from 'yaml';

const BASE = '6c8dd77';
const DOCS = [
  { doc: 'uc1', original: 'docs/02-uc1-solution-architecture.html', slug: 'uc1-solution-architecture' },
  { doc: 'uc2', original: 'docs/03-uc2-content-model.html', slug: 'uc2-content-model' },
];
/** Section ids the site renamed (site spec §0.10). Origins use the site id. */
const RENAMED = { 'uc1:rejected': 'uc1:alternatives' };
/** Sections split by table row rather than by child block. */
const ROW_PIECES = new Set(['uc1:risks']);
const BLOCK = new Set(['p', 'li', 'td', 'th', 'tr', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'table',
  'thead', 'tbody', 'pre', 'ul', 'ol', 'br', 'header', 'footer', 'figure', 'figcaption', 'blockquote', 'nav', 'main']);

const git = (p) => execSync(`git show ${BASE}:${p}`, { encoding: 'utf8', maxBuffer: 1 << 26 });
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
const pres = (node) => (node.tagName === 'pre' ? [node] : selectAll('pre', node));

/** Original sections keyed "<doc>:<site section id>", each with its pieces in order. */
function originalSections() {
  const sections = new Map();
  for (const { doc, original } of DOCS) {
    for (const section of selectAll('main section', fromHtml(git(original)))) {
      const raw = `${doc}:${section.properties.id}`;
      const key = RENAMED[raw] ?? raw;
      if (section.children.some((c) => c.type === 'text' && c.value.trim())) fail(`${key}: loose text in the section cannot be a piece`);
      sections.set(key, ROW_PIECES.has(key)
        ? [select('thead', section), ...selectAll('tbody > tr', section)]
        : section.children.filter((c) => c.type === 'element' && c.tagName !== 'h2'));
    }
  }
  return sections;
}

const pieceArg = process.argv.indexOf('--pieces');
if (pieceArg !== -1) {
  const key = process.argv[pieceArg + 1];
  const pieces = originalSections().get(key);
  if (!pieces) { console.error(`no section ${key}`); process.exit(1); }
  pieces.forEach((p, i) => console.log(`${key}:${i}  ${visibleText(p).slice(0, 100)}`));
  process.exit(0);
}

function* builtPages(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'pagefind' && entry.name !== '_astro') yield* builtPages(full); }
    else if (entry.name.endsWith('.html')) yield full;
  }
}

/** Every element on the built site that carries an origin, with the page it is on. */
function builtOrigins() {
  const found = new Map();
  for (const file of builtPages('dist')) {
    const where = `/${path.relative('dist', file).split(path.sep).join('/').replace(/index\.html$/, '')}`;
    for (const node of selectAll('[data-origin]', fromHtml(fs.readFileSync(file, 'utf8')))) {
      const origin = String(node.properties.dataOrigin);
      if (found.has(origin)) fail(`${origin}: on ${found.get(origin).where} and again on ${where}`);
      else found.set(origin, { node, where });
    }
  }
  return found;
}

const compared = new Set();
function applyAllow(origin, text) {
  return allow.filter((a) => a.origin === origin && !a.retire).reduce((t, a) => {
    if (!t.includes(a.from)) fail(`allowlist: "${a.from}" is not in the original text of ${origin}`);
    return t.split(a.from).join(a.to);
  }, text);
}

function compare(origin, originals, built) {
  compared.add(origin);
  const was = applyAllow(origin, originals.map(visibleText).join(' ').replace(/\s+/g, ' ').trim());
  const now = visibleText(built.node);
  if (was !== now) {
    let k = 0;
    while (was[k] === now[k]) k += 1;
    fail(`${origin} on ${built.where} differs at character ${k}\n    original: …${was.slice(Math.max(0, k - 60), k + 80)}\n    migrated: …${now.slice(Math.max(0, k - 60), k + 80)}`);
    return;
  }
  const preWas = originals.flatMap(pres).map(rawText);
  const preNow = pres(built.node).map(rawText);
  if (preWas.length !== preNow.length || preWas.some((p, i) => p !== preNow[i])) {
    fail(`${origin}: a <pre> block differs in text or whitespace`);
    return;
  }
  console.log(`✓ ${origin}${preWas.length > 0 ? ` (${preWas.length} pre exact)` : ''}`);
}

const sections = originalSections();
const found = builtOrigins();
const retired = new Set(allow.filter((a) => a.retire).map((a) => a.origin));
const matched = new Set();

for (const [key, pieces] of sections) {
  const whole = found.get(`${key}:*`);
  const parts = [...found.keys()].filter((o) => o.startsWith(`${key}:`) && o !== `${key}:*`);
  if (whole) {
    matched.add(`${key}:*`);
    parts.forEach((o) => matched.add(o));
    if (parts.length > 0) fail(`${key}: marked whole on ${whole.where} and also in pieces (${parts.join(', ')})`);
    else compare(`${key}:*`, pieces, whole);
    continue;
  }
  pieces.forEach((piece, i) => {
    const origin = `${key}:${i}`;
    const built = found.get(origin);
    if (built) matched.add(origin);
    if (retired.has(origin)) {
      compared.add(origin);
      if (built) fail(`${origin}: retired in the allowlist but still on ${built.where}`);
      else console.log(`✓ ${origin} retired`);
    } else if (!built) fail(`${origin}: not on the site (${visibleText(piece).slice(0, 60)}…)`);
    else compare(origin, [piece], built);
  });
}
for (const [origin, { where }] of found) if (!matched.has(origin)) fail(`${origin} on ${where}: no such block in the original`);

// Mastheads and footers stay on their idea page.
for (const { doc, original, slug } of DOCS) {
  const before = fromHtml(git(original));
  const after = fromHtml(fs.readFileSync(`dist/ideas/${slug}/index.html`, 'utf8'));
  for (const [part, selector] of [['mast', 'header.mast'], ['footer', 'main footer']]) {
    const a = select(selector, before);
    const b = select(selector, after);
    if (!a || !b) fail(`${doc}:${part}: ${selector} missing`);
    else compare(`${doc}:${part}`, [a], { node: b, where: `/ideas/${slug}/` });
  }
}
for (const a of allow) if (!compared.has(a.origin)) fail(`allowlist: ${a.origin} is not a compared block (stale entry?)`);

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
