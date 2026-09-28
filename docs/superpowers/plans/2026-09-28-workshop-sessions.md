# Workshop Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each of the first three workshop sessions one page holding its agenda topics, the material moved out of UC1/UC2, the questions and decisions to settle, and its expected outcomes.

**Architecture:** Each session is a YAML file (`src/content/sessions/<slug>.yaml`) with the literal agenda text and the topic → question mapping. Topic material is one MDX file per topic (`src/content/topics/<slug>/<topic>.mdx`). `src/pages/sessions/[slug].astro` walks the topics in agenda order. Every block moved out of the original documents carries `data-origin`, and `scripts/verify-fidelity.mjs` reassembles the originals from every built page.

**Tech Stack:** Astro 7 (content layer, MDX), zod through `astro/zod`, vitest, Node verify scripts on `hast-util-*`, Pagefind.

**Spec:** `docs/superpowers/specs/2026-09-28-workshop-sessions-design.md` (baseline commit `b43acfb`)

## Global Constraints

- Content and UI in English. No "rejected" and no "reclassified" in visible text (`pnpm verify:terms` enforces it).
- Session titles, tracks, owners, topic bullets and outcomes are copied literally from `sources/workshop-agenda.md`.
- Moved text is verbatim. Every wording change has an entry in `scripts/fidelity-allowlist.json` with a `reason`.
- Stable IDs, never renumbered: `Q1–Q26`, `Q6b`, `DQ-1–DQ-10`, `U1–U11`, `D-NN`, `CT01–CT23`, `C001–C035`.
- MDX: escape literal `{`/`}` as `\{`/`\}`, no HTML comments, `<pre>`/SVG only through `src/content/fragments/*.html?raw`, and sibling inline elements on one line.
- Data loaders are inline and throw. No `file()` loader, because it swallows parse errors.
- Schemas are `.strict()`.
- `sources/` is read-only once `workshop-agenda.md` is added.
- `pnpm build` = `astro build` + `pagefind` + `verify-anchors`, so a broken internal link fails the build.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A moved block altered by accident** (a dropped sentence, a changed word while cutting and pasting). `verify-fidelity` must fail and name the origin and the character. Pinned by the negative runs in Task 1 and by `pnpm verify` at the end of Tasks 3–5.
2. **A settled question that still carries `idea`/`section`**, for example after someone records a decision and re-adds a section. The build must fail naming the question and its topic. Pinned by the unit test in Task 2.
3. **A topic MDX file whose name does not match its topic id** (`fallback.mdx` for topic `failure`). The build must report both the topic with no material and the orphan file. Pinned by the unit tests in Task 2 and the build test in Task 6.
4. **Agenda text edited in one place only, or bullets reordered.** The agenda test must fail. Pinned in Task 3.
5. **Duplicate element ids on a page** (a question rendered twice, a fragment added twice). Anchors would silently resolve to the first. `verify-anchors` must fail. Pinned in Task 3.

## File map

| File | Responsibility |
|---|---|
| `scripts/verify-fidelity.mjs` | Rebuilds each original section from the `data-origin` pieces on the built site |
| `scripts/fidelity-allowlist.json` | Accepted wording changes and retired pieces, keyed by origin |
| `scripts/verify-anchors.mjs` | Internal links and fragments, plus duplicate ids |
| `sources/workshop-agenda.md` | The agenda as pasted, the literal reference |
| `src/content/sessions/<slug>.yaml` | Session metadata and topic mapping |
| `src/content/topics/<slug>/<topic>.mdx` | Moved material for one topic |
| `src/lib/sessions.ts` | `placementOf`, `topicHref`, `discussedIn`, `stillOpen` |
| `src/lib/schemas.ts` | `topicSchema`, `sessionSchema`, `topicMaterialSchema` |
| `src/lib/validate.ts` | Session rules in `findProblems` |
| `src/pages/sessions/[slug].astro` | The session page |
| `tests/sessions.test.ts`, `tests/agenda-source.test.ts` | New unit tests |

---

### Task 1: Origin-based fidelity check

A refactor: the site does not change, but the checker compares by origin instead of by page and position.

**Files:**
- Modify: `scripts/verify-fidelity.mjs` (rewrite)
- Modify: `scripts/fidelity-allowlist.json` (re-key `page` → `origin`)
- Modify: `src/content/ideas/uc1-solution-architecture.mdx`, `src/content/ideas/uc2-content-model.mdx` (wrap every section body)

**Interfaces:**
- Produces: the `data-origin="<doc>:<section id>:<piece|*>"` contract. The allowlist entry shapes are `{origin, from, to, reason}` and `{origin, retire: true, reason}`. `node scripts/verify-fidelity.mjs --pieces <doc>:<section>` lists pieces.

- [ ] **Step 1: Wrap every section body in both idea MDX files**

```bash
node -e "
const fs = require('fs');
for (const [doc, file] of [['uc1', 'src/content/ideas/uc1-solution-architecture.mdx'], ['uc2', 'src/content/ideas/uc2-content-model.mdx']]) {
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(/(<Section [^>]*\bid=\"([a-z-]+)\"[^>]*>\n)/g, (m, open, id) => open + '<div data-origin=\"' + doc + ':' + id + ':*\">\n');
  s = s.replace(/\n<\/Section>/g, '\n</div>\n</Section>');
  fs.writeFileSync(file, s);
}"
grep -c 'data-origin=' src/content/ideas/uc1-solution-architecture.mdx src/content/ideas/uc2-content-model.mdx
```

Expected: `15` for UC1 and `5` for UC2.

- [ ] **Step 2: Rewrite `scripts/verify-fidelity.mjs`**

Replace the whole file with:

```js
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
```

Before replacing, compare the doc 01 block at the bottom with the current file's. If `b43acfb` changed it, keep the current version of that block.

- [ ] **Step 3: Re-key the allowlist from `page` to `origin`**

```bash
node --input-type=module -e "
import fs from 'node:fs'; import { execSync } from 'node:child_process';
import { fromHtml } from 'hast-util-from-html'; import { select, selectAll } from 'hast-util-select';
const BLOCK = new Set(['p','li','td','th','tr','div','h1','h2','h3','h4','h5','h6','section','table','thead','tbody','pre','ul','ol','br','header','footer','figure','figcaption','blockquote','nav','main']);
const vt = (node) => { const out = []; (function walk(n) { if (n.type === 'text') { out.push(n.value); return; } const b = n.type === 'element' && BLOCK.has(n.tagName); if (b) out.push(' '); (n.children ?? []).forEach(walk); if (b) out.push(' '); })(node); return out.join('').replace(/\s+/g, ' ').trim(); };
const docs = { 'uc1-solution-architecture': ['uc1', 'docs/02-uc1-solution-architecture.html'], 'uc2-content-model': ['uc2', 'docs/03-uc2-content-model.html'] };
const allow = JSON.parse(fs.readFileSync('scripts/fidelity-allowlist.json', 'utf8'));
const out = allow.map(({ page, ...entry }) => {
  const [doc, file] = docs[page];
  const tree = fromHtml(execSync('git show 6c8dd77:' + file, { encoding: 'utf8', maxBuffer: 1 << 26 }));
  const hit = selectAll('main section', tree).find((s) => vt(s).includes(entry.from));
  const where = hit ? (hit.properties.id === 'rejected' ? 'alternatives' : hit.properties.id) + ':*'
    : vt(select('header.mast', tree)).includes(entry.from) ? 'mast' : 'footer';
  return { origin: doc + ':' + where, ...entry };
});
fs.writeFileSync('scripts/fidelity-allowlist.json', JSON.stringify(out, null, 2) + '\n');
console.log(out.map((e) => e.origin).join('\n'));
"
```

Expected output, in this order: `uc1:model:*`, `uc1:authoring:*`, `uc1:alternatives:*` four times, `uc1:open:*`.

- [ ] **Step 4: Build and verify**

Run: `pnpm build && pnpm verify`
Expected: build OK. Fidelity prints `✓ uc1:position:*` … `✓ uc2:coverage:*`, `✓ uc1:ref:* (1 pre exact)`, `✓ uc1:consumption:* (1 pre exact)`, the four mast/footer lines and the doc 01 lines, then ends with `fidelity: ok`. Anchors and terms pass.

- [ ] **Step 5: Prove the checker fails (Review Focus 1)**

```bash
cp dist/ideas/uc1-solution-architecture/index.html /tmp/uc1.html
sed -i '' 's/Nine interactions\./Nine interaction./' dist/ideas/uc1-solution-architecture/index.html
pnpm verify:fidelity; echo "exit $?"
sed -i '' 's/data-origin="uc1:sizing:\*"//' dist/ideas/uc1-solution-architecture/index.html
pnpm verify:fidelity; echo "exit $?"
cp /tmp/uc1.html dist/ideas/uc1-solution-architecture/index.html
node scripts/verify-fidelity.mjs --pieces uc1:risks
```

Expected:
- First run: `✗ uc1:consumption:* on /ideas/uc1-solution-architecture/ differs at character …`, `exit 1`.
- Second run: the same failure plus three `✗ uc1:sizing:N: not on the site` lines, N = 0–2 (the wrapper is gone, so each piece is missing), `exit 1`.
- `--pieces`: nine lines, from `uc1:risks:0  Risk Consequence if it lands Mitigation` to `uc1:risks:8  Translation route undecided …`.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-fidelity.mjs scripts/fidelity-allowlist.json src/content/ideas/
git commit -m "Check fidelity by block origin instead of by page

Every original section body now carries data-origin, so a block can
move to another page and still be compared against the original.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Session data model

No sessions exist yet, so the site stays the same. "Discussed in" is now computed in one place.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-28-workshop-sessions-design.md` (amendment: `see`)
- Modify: `src/lib/schemas.ts`, `src/lib/types.ts`, `src/lib/validate.ts`, `src/lib/data.ts`, `src/content.config.ts`
- Create: `src/lib/sessions.ts`, `src/content/sessions/.gitkeep`, `src/content/topics/.gitkeep`
- Modify: `src/components/QuestionItem.astro`, `src/pages/decide.astro`, `src/pages/registers/questions.astro`
- Modify: `tests/fixtures.ts`, `tests/schemas.test.ts`, `tests/validate.test.ts`
- Create: `tests/sessions.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `TopicMeta { id; agenda; nav; settles: string[]; decisions: string[]; prompt: boolean; see?: { href: string; label: string } }`
  - `SessionMeta { slug; title; short; track; owner; order: number; outcomes: string[]; topics: TopicMeta[] }`
  - `SiteData.sessions: SessionMeta[]` (sorted by `order`) and `SiteData.materials: string[]` (`"<session>/<topic>"`)
  - `placementOf(id, sessions) → { session, topic } | undefined`
  - `topicHref(session, topic?) → string`
  - `discussedIn(q, { sessions, ideas }) → { href, label } | undefined`
  - `stillOpen(session, questions) → { toConfirm: Question[]; toDecide: Question[] }`
  - `QuestionItem` prop `discussedIn?: { href: string; label: string }`, which replaces `ideaTitles`

- [ ] **Step 1: Amend the spec for cross-links on prompt topics**

A prompt topic has no MDX, so it has nowhere to put the "link to session 1" that spec §2.2 (`served-variant`) and §2.3 (`rendering`) call for. Add an optional `see` to topics. In the spec:
- §2.2: change the `served-variant` row's material to `*prompt*, see Session 1 \`#flow\` (interaction 9)`.
- §2.3: change the `rendering` row's material to `*prompt*, see Session 1 \`#performance\` (where the cache sits)`.
- §3.2: add to the topic field list: `see` (optional `{ href, label }`, rendered as "See also" after the material or the prompt line).

- [ ] **Step 2: Write the failing schema tests**

Append to `tests/schemas.test.ts` and add `sessionSchema` to its import from `../src/lib/schemas`:

```ts
describe('sessionSchema', () => {
  const valid = {
    id: 'nba-hand-off', title: 'NBA hand-off', short: 'NBA hand-off', track: 'Cross-channel proof points',
    owner: 'Globant w/ Contentful', order: 2, outcomes: ['NBA follow-ups logged'],
    topics: [{ agenda: 'Contents of the notification payload sent to channels', id: 'payload', nav: 'Notification payload' }],
  };

  it('fills topic defaults', () => {
    expect(sessionSchema.parse(valid).topics[0]).toEqual({
      agenda: 'Contents of the notification payload sent to channels', id: 'payload', nav: 'Notification payload',
      settles: [], decisions: [], prompt: false,
    });
  });
  it('rejects a misspelt topic key instead of dropping it', () => {
    expect(sessionSchema.safeParse({ ...valid, topics: [{ ...valid.topics[0], setles: ['Q1'] }] }).success).toBe(false);
  });
  it('rejects a session without outcomes', () => {
    expect(sessionSchema.safeParse({ ...valid, outcomes: [] }).success).toBe(false);
  });
  it('rejects a topic id that is not a lower-case slug', () => {
    expect(sessionSchema.safeParse({ ...valid, topics: [{ ...valid.topics[0], id: 'Payload' }] }).success).toBe(false);
  });
  it('rejects a decision ID in settles', () => {
    expect(sessionSchema.safeParse({ ...valid, topics: [{ ...valid.topics[0], settles: ['D-01'] }] }).success).toBe(false);
  });
  it('accepts a see-also link to a site page', () => {
    const topic = { ...valid.topics[0], prompt: true, see: { href: '/sessions/proof-point-delivery/#flow', label: 'Session 1' } };
    expect(sessionSchema.safeParse({ ...valid, topics: [topic] }).success).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test tests/schemas.test.ts`
Expected: FAIL. `sessionSchema` is not exported.

- [ ] **Step 4: Add the schemas**

In `src/lib/schemas.ts`, after `decisionSchema`:

```ts
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const topicSchema = z.object({
  /** The agenda bullet, copied literally from sources/workshop-agenda.md. */
  agenda: z.string().min(1),
  id: z.string().regex(SLUG),
  nav: z.string().min(1),
  settles: z.array(z.string().regex(/^(Q\d+b?|DQ-\d+|U\d+)$/)).default([]),
  decisions: z.array(z.string().regex(/^D-\d{2}$/)).default([]),
  /** A topic with no prepared material: shown as a discussion prompt, and has no MDX file. */
  prompt: z.boolean().default(false),
  see: z.object({ href: z.string().startsWith('/'), label: z.string().min(1) }).strict().optional(),
}).strict();

export const sessionSchema = z.object({
  id: z.string().regex(SLUG),
  title: z.string().min(1),
  short: z.string().min(1),
  track: z.string().min(1),
  owner: z.string().min(1),
  order: z.number().int().positive(),
  outcomes: z.array(z.string().min(1)).min(1),
  topics: z.array(topicSchema).min(1),
}).strict();

/** Topic material is MDX without frontmatter. */
export const topicMaterialSchema = z.object({}).strict();
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test tests/schemas.test.ts`
Expected: PASS.

- [ ] **Step 6: Add the types**

In `src/lib/types.ts`, add before `SiteData`:

```ts
export interface TopicMeta {
  id: string;
  agenda: string;
  nav: string;
  settles: string[];
  decisions: string[];
  prompt: boolean;
  see?: { href: string; label: string };
}

export interface SessionMeta {
  slug: string;
  title: string;
  short: string;
  track: string;
  owner: string;
  order: number;
  outcomes: string[];
  topics: TopicMeta[];
}
```

Add to `SiteData`:

```ts
  sessions: SessionMeta[];
  /** Topic material files, as "<session>/<topic>". */
  materials: string[];
```

- [ ] **Step 7: Add fixture builders**

In `tests/fixtures.ts`, extend the type import to `import type { Question, SessionMeta, SiteData, TopicMeta } from '../src/lib/types';` and add:

```ts
export function topic(overrides: Partial<TopicMeta> & Pick<TopicMeta, 'id'>): TopicMeta {
  return { agenda: `Topic ${overrides.id}`, nav: `Topic ${overrides.id}`, settles: [], decisions: [], prompt: false, ...overrides };
}

export function session(overrides: Partial<SessionMeta> = {}): SessionMeta {
  return {
    slug: 'proof-point-delivery', title: 'Proof point delivery', short: 'Delivery', track: 'Cross-channel proof points',
    owner: 'Globant', order: 1, outcomes: ['Pattern agreed'],
    topics: [
      topic({ id: 'ownership', nav: 'Ownership', settles: ['DQ-9'], decisions: ['D-05'] }),
      topic({ id: 'reference-implementations', prompt: true }),
    ],
    ...overrides,
  };
}
```

In `siteData()`, add before `...overrides`:

```ts
    sessions: [session()],
    materials: ['proof-point-delivery/ownership'],
```

- [ ] **Step 8: Write the failing `sessions` tests**

Create `tests/sessions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { discussedIn, placementOf, stillOpen, topicHref } from '../src/lib/sessions';
import { question, session, siteData, topic } from './fixtures';

describe('placementOf', () => {
  const { sessions } = siteData();
  it('finds the topic that settles a question', () => {
    expect(placementOf('DQ-9', sessions)).toMatchObject({ session: { slug: 'proof-point-delivery' }, topic: { id: 'ownership' } });
  });
  it('has nothing for a question no session settles', () => {
    expect(placementOf('Q1', sessions)).toBeUndefined();
  });
});

describe('topicHref', () => {
  it('links to the topic section, or to the top of the session', () => {
    const s = session();
    expect(topicHref(s, s.topics[0])).toBe('/sessions/proof-point-delivery/#ownership');
    expect(topicHref(s)).toBe('/sessions/proof-point-delivery/');
  });
});

describe('discussedIn', () => {
  const data = siteData();
  it('links a settled question to its session topic', () => {
    expect(discussedIn(question({ id: 'DQ-9' }), data)).toEqual({ href: '/sessions/proof-point-delivery/#ownership', label: 'Delivery › Ownership' });
  });
  it('falls back to the idea section for a question no session settles', () => {
    expect(discussedIn(question({ id: 'Q4', idea: 'uc1-solution-architecture', section: 'authoring' }), data))
      .toEqual({ href: '/ideas/uc1-solution-architecture/#authoring', label: 'UC1' });
  });
  it('links to the top of the idea when there is no section', () => {
    expect(discussedIn(question({ id: 'U6', idea: 'uc1-solution-architecture' }), data)?.href).toBe('/ideas/uc1-solution-architecture/');
  });
  it('has nothing for a question discussed nowhere', () => {
    expect(discussedIn(question({ id: 'Q7' }), data)).toBeUndefined();
  });
});

describe('stillOpen', () => {
  const s = session({ topics: [topic({ id: 'a', settles: ['Q5', 'Q2'] }), topic({ id: 'b', settles: ['Q6', 'Q3'] })] });
  const questions = [
    question({ id: 'Q2', status: 'answered', answer: 'NBA', confirmedByEG: true }),
    question({ id: 'Q3', status: 'answered', answer: 'One reference' }),
    question({ id: 'Q5', status: 'assumed', position: 'In the resolver' }),
    question({ id: 'Q6' }),
    question({ id: 'Q9' }),
  ];
  const open = stillOpen(s, questions);

  it('drops what EG has confirmed and what the session does not settle', () => {
    expect([...open.toConfirm, ...open.toDecide].map((q) => q.id).sort()).toEqual(['Q3', 'Q5', 'Q6']);
  });
  it('splits like /decide, in the order the topics raise them', () => {
    expect(open.toConfirm.map((q) => q.id)).toEqual(['Q5', 'Q3']);
    expect(open.toDecide.map((q) => q.id)).toEqual(['Q6']);
  });
});
```

- [ ] **Step 9: Run the tests to verify they fail**

Run: `pnpm test tests/sessions.test.ts`
Expected: FAIL. `../src/lib/sessions` does not exist.

- [ ] **Step 10: Implement `src/lib/sessions.ts`**

```ts
import { hasProposal, onAgenda } from './agenda';
import type { Question, SessionMeta, SiteData, TopicMeta } from './types';

export interface Placement { session: SessionMeta; topic: TopicMeta }
export interface Link { href: string; label: string }
export interface StillOpen { toConfirm: Question[]; toDecide: Question[] }

/** The session topic that settles a question. Validation keeps it to one. */
export function placementOf(id: string, sessions: SessionMeta[]): Placement | undefined {
  for (const session of sessions) {
    const topic = session.topics.find((t) => t.settles.includes(id));
    if (topic) return { session, topic };
  }
  return undefined;
}

export const topicHref = (session: SessionMeta, topic?: TopicMeta): string =>
  `/sessions/${session.slug}/${topic ? `#${topic.id}` : ''}`;

/** "Discussed in": the session topic that settles the question, else the idea section it points at. */
export function discussedIn(q: Question, data: Pick<SiteData, 'sessions' | 'ideas'>): Link | undefined {
  const placed = placementOf(q.id, data.sessions);
  if (placed) return { href: topicHref(placed.session, placed.topic), label: `${placed.session.short} › ${placed.topic.nav}` };
  if (!q.idea) return undefined;
  const idea = data.ideas.find((i) => i.slug === q.idea);
  return { href: `/ideas/${q.idea}/${q.section ? `#${q.section}` : ''}`, label: idea?.short ?? q.idea };
}

/** What a session leaves on the agenda, in the order its topics raise it. */
export function stillOpen(session: SessionMeta, questions: Question[]): StillOpen {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const items = session.topics
    .flatMap((t) => t.settles)
    .map((id) => byId.get(id))
    .filter((q): q is Question => q !== undefined && onAgenda(q));
  return { toConfirm: items.filter(hasProposal), toDecide: items.filter((q) => !hasProposal(q)) };
}
```

- [ ] **Step 11: Run the tests to verify they pass**

Run: `pnpm test tests/sessions.test.ts`
Expected: PASS.

- [ ] **Step 12: Write the failing validation tests (Review Focus 2 and 3)**

Append to `tests/validate.test.ts`, and extend its fixture import to `import { question, session, siteData, topic } from './fixtures';`:

```ts
describe('findProblems: sessions', () => {
  const withTopics = (topics: ReturnType<typeof topic>[], materials: string[]) =>
    siteData({ sessions: [session({ topics })], materials });

  it('reports a topic settling an unknown question', () => {
    const data = withTopics([topic({ id: 'ownership', settles: ['Q99'] })], ['proof-point-delivery/ownership']);
    expect(findProblems(data)).toContain('proof-point-delivery/ownership: settles unknown question Q99');
  });
  it('reports a topic listing an unknown decision', () => {
    const data = withTopics([topic({ id: 'ownership', decisions: ['D-99'] })], ['proof-point-delivery/ownership']);
    expect(findProblems(data)).toContain('proof-point-delivery/ownership: unknown decision D-99');
  });
  it('reports a question settled in two topics', () => {
    const data = withTopics(
      [topic({ id: 'ownership', settles: ['DQ-9'] }), topic({ id: 'performance', settles: ['DQ-9'] })],
      ['proof-point-delivery/ownership', 'proof-point-delivery/performance'],
    );
    expect(findProblems(data)).toContain('DQ-9: settled in both proof-point-delivery/ownership and proof-point-delivery/performance');
  });
  it('reports a settled question that still points at an idea', () => {
    const data = siteData({ questions: [
      question({ id: 'Q1', group: 'blocking' }), question({ id: 'U1', group: 'uc2-model' }),
      question({ id: 'DQ-9', group: 'uc1-design', idea: 'uc1-solution-architecture', section: 'open' }),
    ] });
    expect(findProblems(data)).toContain('DQ-9: settled in proof-point-delivery/ownership, so it must not also set idea/section');
  });
  it('reports a topic with no material file', () => {
    expect(findProblems(siteData({ materials: [] }))).toContain(
      'proof-point-delivery/ownership: no material — add src/content/topics/proof-point-delivery/ownership.mdx or mark the topic prompt: true',
    );
  });
  it('reports a material file behind a discussion prompt', () => {
    const data = siteData({ materials: ['proof-point-delivery/ownership', 'proof-point-delivery/reference-implementations'] });
    expect(findProblems(data)).toContain(
      'proof-point-delivery/reference-implementations: a discussion prompt has no material, but src/content/topics/proof-point-delivery/reference-implementations.mdx exists',
    );
  });
  it('reports a material file no session declares', () => {
    const data = siteData({ materials: ['proof-point-delivery/ownership', 'proof-point-delivery/fallback'] });
    expect(findProblems(data)).toContain('src/content/topics/proof-point-delivery/fallback.mdx: no session declares topic proof-point-delivery/fallback');
  });
  it('reports a repeated topic id', () => {
    const data = withTopics([topic({ id: 'ownership' }), topic({ id: 'ownership' })], ['proof-point-delivery/ownership']);
    expect(findProblems(data)).toContain('proof-point-delivery: duplicate topic ownership');
  });
  it('reports two sessions sharing an order or a short label', () => {
    const second = session({ slug: 'nba-hand-off', topics: [topic({ id: 'payload', prompt: true })] });
    const problems = findProblems(siteData({ sessions: [session(), second] }));
    expect(problems).toContain('sessions proof-point-delivery and nba-hand-off share order 1');
    expect(problems).toContain('sessions proof-point-delivery and nba-hand-off share the short label "Delivery"');
  });
});
```

- [ ] **Step 13: Run the tests to verify they fail**

Run: `pnpm test tests/validate.test.ts`
Expected: the nine new tests FAIL, and the existing tests still PASS.

- [ ] **Step 14: Implement the rules**

In `src/lib/validate.ts`, after the loop over `data.decisions` (the one that uses `questionIds`), add:

```ts
  // Sessions: every question is settled in at most one topic, and every topic's material exists.
  const decisionIds = new Set(data.decisions.map((d) => d.id));
  const materials = new Set(data.materials);
  const declared = new Set<string>();
  const settledIn = new Map<string, string>();
  const byOrder = new Map<number, string>();
  const byShort = new Map<string, string>();
  for (const s of data.sessions) {
    const sameOrder = byOrder.get(s.order);
    if (sameOrder) problems.push(`sessions ${sameOrder} and ${s.slug} share order ${s.order}`);
    else byOrder.set(s.order, s.slug);
    const sameShort = byShort.get(s.short);
    if (sameShort) problems.push(`sessions ${sameShort} and ${s.slug} share the short label "${s.short}"`);
    else byShort.set(s.short, s.slug);
    const topicIds = new Set<string>();
    for (const t of s.topics) {
      const where = `${s.slug}/${t.id}`;
      if (topicIds.has(t.id)) problems.push(`${s.slug}: duplicate topic ${t.id}`);
      topicIds.add(t.id);
      declared.add(where);
      for (const id of t.settles) {
        if (!questionIds.has(id)) problems.push(`${where}: settles unknown question ${id}`);
        const before = settledIn.get(id);
        if (before) problems.push(`${id}: settled in both ${before} and ${where}`);
        else settledIn.set(id, where);
      }
      for (const id of t.decisions) if (!decisionIds.has(id)) problems.push(`${where}: unknown decision ${id}`);
      if (t.prompt && materials.has(where)) problems.push(`${where}: a discussion prompt has no material, but src/content/topics/${where}.mdx exists`);
      if (!t.prompt && !materials.has(where)) problems.push(`${where}: no material — add src/content/topics/${where}.mdx or mark the topic prompt: true`);
    }
  }
  for (const m of data.materials) if (!declared.has(m)) problems.push(`src/content/topics/${m}.mdx: no session declares topic ${m}`);
  for (const q of data.questions) {
    const where = settledIn.get(q.id);
    if (where && (q.idea || q.section)) problems.push(`${q.id}: settled in ${where}, so it must not also set idea/section`);
  }
```

- [ ] **Step 15: Run all tests**

Run: `pnpm test --exclude tests/build-errors.test.ts`
Expected: PASS. (The build tests run in Step 20.)

- [ ] **Step 16: Load the collections**

In `src/content.config.ts`:
- Change the fs import to `import { readdir, readFile } from 'node:fs/promises';`.
- Add `sessionSchema, topicMaterialSchema` to the schemas import.
- Below `listFrom`, add:

```ts
const SESSIONS = './src/content/sessions';

/** One session per YAML file, named by its slug. Throws on bad YAML, like listFrom. */
async function sessionsFrom(dir: string): Promise<{ id: string }[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.yaml')).sort();
  return Promise.all(files.map(async (f) => {
    const path = `${dir}/${f}`;
    let parsed: unknown;
    try {
      parsed = YAML.parse(await readFile(path, 'utf8'));
    } catch (error) {
      throw new Error(`${path}: ${(error as Error).message}`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${path}: expected one session`);
    if ('id' in parsed) throw new Error(`${path}: the file name is the session id, so remove "id"`);
    return { id: f.slice(0, -'.yaml'.length), ...parsed };
  }));
}
```

- Add to `collections`:

```ts
  sessions: defineCollection({ loader: () => sessionsFrom(SESSIONS), schema: sessionSchema }),
  // Topic material: src/content/topics/<session>/<topic>.mdx, id "<session>/<topic>".
  topics: defineCollection({ loader: glob({ pattern: '*/*.mdx', base: './src/content/topics' }), schema: topicMaterialSchema }),
```

Create the two empty directories: `touch src/content/sessions/.gitkeep src/content/topics/.gitkeep`.

- [ ] **Step 17: Build `SiteData.sessions` and `materials`**

In `src/lib/data.ts`:
- Add `'sessions'` and `'topics'` to the `Promise.all` (destructure as `sessions, topics`).
- Import `SessionMeta` from `./types`.
- Before `const data: SiteData`, add:

```ts
  const sessionList: SessionMeta[] = sessions
    .map(({ data: { id, ...rest } }) => ({ slug: id, ...rest }))
    .sort((a, b) => a.order - b.order);
  const settled = new Set(sessionList.flatMap((s) => s.topics.flatMap((t) => t.settles)));
```

- Replace the UC2 line in `questions` with:

```ts
      // A UC2 question is discussed in the UC2 document unless a session settles it.
      ...uc2Questions.map((e) => ({ ...e.data, group: 'uc2-model' as const, ...(settled.has(e.data.id) ? {} : { idea: 'uc2-content-model' }) })),
```

- Add to the `data` object: `sessions: sessionList,` and `materials: topics.map((e) => e.id).sort(),`.

- [ ] **Step 18: Compute "Discussed in" in one place**

`src/components/QuestionItem.astro`: replace the `ideaTitles` prop and the local `discussedIn` computation:

```astro
interface Props {
  q: Question;
  /** True only on the register, which is where the ID is defined. */
  defines?: boolean;
  /** From discussedIn(). Omitted on the page that discusses the question. */
  discussedIn?: { href: string; label: string };
}
const { q, defines = false, discussedIn } = Astro.props;
```

(Delete the `const discussedIn = q.idea ? …` line. The template already reads `discussedIn`.)

`src/pages/decide.astro` and `src/pages/registers/questions.astro`: delete the `ideaTitles` line, add `import { discussedIn } from '../lib/sessions';` (`'../../lib/sessions'` in the register), and pass `discussedIn={discussedIn(q, data)}` instead of `ideaTitles={ideaTitles}`.

- [ ] **Step 19: Type-check, build, verify**

Run: `pnpm check && pnpm build && pnpm verify`
Expected: 0 errors. The build may warn that no files match in `src/content/topics`. Verify OK. `/decide/` still shows "Discussed in UC1" for Q1.

- [ ] **Step 20: Run the full test suite, including the build tests**

Run: `pnpm test`
Expected: PASS (the build tests take about a minute).

- [ ] **Step 21: Commit**

```bash
git add docs/superpowers/specs/2026-09-28-workshop-sessions-design.md src/lib src/content.config.ts src/content/sessions/.gitkeep src/content/topics/.gitkeep src/components/QuestionItem.astro src/pages/decide.astro src/pages/registers/questions.astro tests
git commit -m "Add the session data model

Sessions and topic material load as collections and are validated
against questions and decisions. \"Discussed in\" is computed once
and prefers the session that settles a question.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Session page and Session 1

**Files:**
- Create: `sources/workshop-agenda.md`, `tests/agenda-source.test.ts`
- Create: `src/pages/sessions/[slug].astro`
- Modify: `src/layouts/Doc.astro`, `src/layouts/Base.astro`, `src/pages/index.astro`, `src/styles/site.css`, `src/styles/present.css`
- Create: `src/content/sessions/proof-point-delivery.yaml`
- Create: `src/content/topics/proof-point-delivery/{flow,resolution-layer,ownership,sfmc,performance,failure,surfaces}.mdx`
- Modify: `src/content/ideas/uc1-solution-architecture.mdx`, `scripts/fidelity-allowlist.json`, `data/questions.yaml`
- Modify: `src/lib/validate.ts`, `tests/validate.test.ts`, `scripts/verify-anchors.mjs`
- Delete: `src/content/sessions/.gitkeep`, `src/content/topics/.gitkeep`

**Interfaces:**
- Consumes: `SiteData.sessions`, `SiteData.materials`, `stillOpen`, `topicHref` (Task 2), and the `data-origin` contract (Task 1).
- Produces: the page `/sessions/<slug>/`, with section ids `agenda`, one per topic id, and `outcomes`. `Doc` props `lede?` and `outcomes?`, and `kind: 'session'`.

- [ ] **Step 1: Add the agenda source**

Create `sources/workshop-agenda.md` with a first line `# EG – Contentful onsite workshop agenda (pasted 2026-09-28)`, a blank line, and then the agenda text exactly as pasted in the conversation of 2026-09-28. That text runs from `Cross-channel proof point delivery and the Content Resolution API` to `Hosting and security requirements identified for EG review`, including the `Lunch` line, with one item per line.

- [ ] **Step 2: Write the agenda test (Review Focus 4)**

Create `tests/agenda-source.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const SOURCE = readFileSync('sources/workshop-agenda.md', 'utf8').split('\n').map((line) => line.trim());
const DIR = 'src/content/sessions';
const sessions = readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => ({ file: f, ...YAML.parse(readFileSync(`${DIR}/${f}`, 'utf8')) }));
const starts = sessions.map((s) => SOURCE.indexOf(s.title)).sort((a, b) => a - b);

describe('session text is copied literally from sources/workshop-agenda.md', () => {
  it('has sessions to check', () => {
    expect(sessions.length).toBeGreaterThan(0);
  });
  for (const s of sessions) {
    it(`${s.file}: title, track, owner, bullets and outcomes, in the agenda's order`, () => {
      const start = SOURCE.indexOf(s.title);
      expect(start, `title "${s.title}"`).toBeGreaterThanOrEqual(0);
      const end = starts.find((i) => i > start) ?? SOURCE.length;
      let at = start;
      for (const line of [s.track, `Owner: ${s.owner}`, ...s.topics.map((t: { agenda: string }) => t.agenda), ...s.outcomes]) {
        const next = SOURCE.indexOf(line, at + 1);
        expect(next > at && next < end, `"${line}" is missing from the session, or out of order`).toBe(true);
        at = next;
      }
    });
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm test tests/agenda-source.test.ts`
Expected: FAIL on `has sessions to check`.

- [ ] **Step 4: Add the Session 1 YAML**

Create `src/content/sessions/proof-point-delivery.yaml`:

```yaml
title: Cross-channel proof point delivery and the Content Resolution API
short: Delivery
track: Cross-channel proof points
owner: Globant, Contentful and Salesforce
order: 1
outcomes:
  - Target delivery pattern agreed in principle
  - Custom build elements and their ownership identified
  - Latency and volume assumptions documented for validation
  - Questions for NBA Engineering logged
topics:
  - agenda: "End to end flow: NBA decision, notification to the channel, channel retrieves the proof point by reference"
    id: flow
    nav: End-to-end flow
  - agenda: "The proposed resolution layer: what Contentful provides natively, what needs configuration, and what would be custom build"
    id: resolution-layer
    nav: Resolution layer
    settles: [Q5]
    decisions: [D-04, D-06]
  - agenda: "Ownership of any custom layer: who builds, hosts and supports it"
    id: ownership
    nav: Build, host, support
    settles: [DQ-9, DQ-10]
    decisions: [D-09]
  - agenda: How SFMC retrieves content at send time
    id: sfmc
    nav: SFMC at send time
    settles: [Q6, Q22, DQ-4]
  - agenda: Performance at production volume, including the burst of requests after a large send
    id: performance
    nav: Performance at volume
    settles: [DQ-1, DQ-2, DQ-3]
  - agenda: Failure handling and fallback
    id: failure
    nav: Failure and fallback
    settles: [DQ-5, DQ-6]
    decisions: [D-08]
  - agenda: Whether the same pattern serves partner web and VMC
    id: surfaces
    nav: Partner web and VMC
    settles: [DQ-7, DQ-8]
    decisions: [D-07]
  - agenda: Reference implementations of this pattern
    id: reference-implementations
    nav: Reference implementations
    prompt: true
```

Run: `pnpm test tests/agenda-source.test.ts`
Expected: PASS. If a line fails, fix the YAML (never the source) until it matches the source character for character.

- [ ] **Step 5: Move the whole-section topics**

For each row: create the file, then cut the whole `<div data-origin="uc1:<section>:*">…</div>` block (added in Task 1) out of the UC1 MDX and paste it in unchanged. Then delete the now-empty `<Section …>` / `</Section>` lines in UC1.

| New file | Block | Extra |
|---|---|---|
| `topics/proof-point-delivery/flow.mdx` | `uc1:consumption:*` | first lines `import uc1Fragment4 from '../../fragments/uc1-4.html?raw';` and `import uc1Fragment5 from '../../fragments/uc1-5.html?raw';`, then a blank line |
| `topics/proof-point-delivery/performance.mdx` | `uc1:performance:*` | — |
| `topics/proof-point-delivery/failure.mdx` | `uc1:failure:*` | — |
| `topics/proof-point-delivery/surfaces.mdx` | `uc1:surfaces:*` | then the risk table below with row 7 |
| `topics/proof-point-delivery/ownership.mdx` | `uc1:ownership:*` | then the risk table below with row 6, plus the rewording in Step 7 |

The **risk table** used in session topics. The header row is copied without an origin. Each row is cut from UC1 §15 (`id="risks"`) and gets its origin on the `<tr>`:

```mdx
<h3>Risks carried by this design</h3>
<div class="scroll">
<table>
  <thead><tr><th style="width:26%">Risk</th><th style="width:37%">Consequence if it lands</th><th>Mitigation</th></tr></thead>
  <tbody>
    <tr data-origin="uc1:risks:7">…the "UC2 coupling discovered late" row, cut from UC1, unchanged…</tr>
  </tbody>
</table>
</div>
```

UC1 §15 rows, in order: 1 grammatical agreement, 2 SFMC per-recipient call, 3 AI actions, 4 resolution service as scope creep, 5 NBA variant index, 6 support ownership, 7 UC2 coupling, 8 translation route. Row 0 is the head. Confirm with `node scripts/verify-fidelity.mjs --pieces uc1:risks`.

- [ ] **Step 6: Build the split topics**

`topics/proof-point-delivery/resolution-layer.mdx`, top to bottom:
1. The UC1 §01 block `<div class="decide risk">` whose h4 starts `<span class="stamp">new</span>A thin resolution service`, cut from UC1, with `data-origin="uc1:position:4"` added to its opening tag.
2. The §01 block whose h4 starts `<span class="stamp">deferred</span>Grammatical agreement`, with `data-origin="uc1:position:6"`.
3. `<h3>System responsibilities</h3>`, then the `uc1:components:*` block (cut whole), with the rewording in Step 7.
4. `<h3>Alternatives considered</h3>`, then the §12 block whose h4 is `Channels calling the delivery API directly, no resolution layer`, with `data-origin="uc1:alternatives:1"`.
5. The risk table from Step 5 with rows 1 and 4, in that order, with the row 4 rewording in Step 7.

`topics/proof-point-delivery/sfmc.mdx`:

```mdx
<p class="sec-note">The send-time fetch is interactions 5 and 6 of the <a href="#flow">consumption flow</a>.</p>

<h3>Risks carried by this design</h3>
<div class="scroll">
<table>
  <thead><tr><th style="width:26%">Risk</th><th style="width:37%">Consequence if it lands</th><th>Mitigation</th></tr></thead>
  <tbody>
    <tr data-origin="uc1:risks:2">…the "SFMC cannot make a per-recipient call at send time" row, cut from UC1, unchanged…</tr>
  </tbody>
</table>
</div>
```

In UC1, what stays of the split sections:
- §01 `position`: delete its `uc1:position:*` wrapper and mark each remaining block: `<p class="sec-note" data-origin="uc1:position:0">`, the Q1 block `:1`, the Q2 block `:2`, the Q3 block `:3` and the Q6b block `:5`.
- §12 `alternatives`: delete the wrapper and mark the remaining blocks `:0` (tone and channel), `:2` (one entry per partner), `:3` (Contentful resolving) and `:4` (opaque hashed ID).
- §15 `risks`: delete the wrapper. Put `data-origin="uc1:risks:0"` on the `<thead>` and origins on the remaining rows 3, 5 and 8.

- [ ] **Step 7: Reword the cross-references**

Make each change in the MDX and add the matching entry to `scripts/fidelity-allowlist.json`. `from` is the original text and `to` is the visible text after the change.

| Origin | In the MDX, replace | with | Allowlist `from` → `to` |
|---|---|---|---|
| `uc1:position:1` | `See the deferred-scope note below, because` | `See the <a href="/sessions/proof-point-delivery/#resolution-layer">deferred-scope note in Session 1</a>, because` | `See the deferred-scope note below` → `See the deferred-scope note in Session 1` |
| `uc1:components:*` | `and the fallback behaviour of section 09` | `and the fallback behaviour set out in <a href="#failure">Failure handling and fallback</a>` | `and the fallback behaviour of section 09` → `and the fallback behaviour set out in Failure handling and fallback` |
| `uc1:ownership:*` | `the fallback behaviour above` | `the fallback behaviour set out in <a href="#failure">Failure handling and fallback</a>` | `the fallback behaviour above` → `the fallback behaviour set out in Failure handling and fallback` |
| `uc1:ownership:*` | `the cache topology in section 08` | `the cache topology set out in <a href="#performance">Performance at production volume</a>` | `the cache topology in section 08` → `the cache topology set out in Performance at production volume` |
| `uc1:risks:4` | `Section 10 names who builds` | `<a href="#ownership">The ownership topic</a> names who builds` | `Section 10 names who builds` → `The ownership topic names who builds` |
| `uc1:open:*` | `arising from the production concerns above` | `arising from the production concerns in <a href="/sessions/proof-point-delivery/">Session 1</a>` | `arising from the production concerns above` → `arising from the production concerns in Session 1` |
| `uc1:open:*` | `None — estimates in section 08 are` | `None — the estimates in <a href="/sessions/proof-point-delivery/#performance">Performance at production volume</a> are` | `None — estimates in section 08 are` → `None — the estimates in Performance at production volume are` |
| `uc1:open:*` | `As specified in section 09` | `As specified in <a href="/sessions/proof-point-delivery/#failure">Failure handling and fallback</a>` | `As specified in section 09` → `As specified in Failure handling and fallback` |
| `uc1:open:*` | `Decides the cache topology in section 08` | `Decides the cache topology set out in <a href="/sessions/proof-point-delivery/#performance">Performance at production volume</a>` | `Decides the cache topology in section 08` → `Decides the cache topology set out in Performance at production volume` |

Every new entry gets `"reason": "Section numbers are gone: the section is now a topic of Session 1"`. The `uc1:position:1` entry gets `"reason": "The deferred-scope note moved to the resolution-layer topic of Session 1"`.

Re-key the four "Rejected" entries from `uc1:alternatives:*` to the block each is in: `Rejected on three counts:` → `uc1:alternatives:1`, `Rejected: it puts partner data` → `uc1:alternatives:2`, `Rejected because it contradicts` → `uc1:alternatives:3`, `Rejected: an opaque token` → `uc1:alternatives:4`.

- [ ] **Step 8: Tidy UC1**

In `src/content/ideas/uc1-solution-architecture.mdx`:
- Delete the imports `uc1Fragment4` and `uc1Fragment5`.
- Renumber the remaining sections `n="01"`…`n="09"` in order: position, model, ref, authoring, validation, alternatives, sizing, open, risks.
- After the imports and before the first `<Section`, add the line
  `<p class="moved">The delivery pattern, the Content Resolution API, performance, failure handling and ownership are presented in <a href="/sessions/proof-point-delivery/">Session 1</a>.</p>`

- [ ] **Step 9: Unplace DQ-1–DQ-10 from UC1**

```bash
node -e "
const fs = require('fs'); const f = 'data/questions.yaml';
fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/\n  idea: uc1-solution-architecture\n  section: open(?=\n)/g, ''));"
grep -c 'section: open' data/questions.yaml
```

Expected: `0`.

- [ ] **Step 10: Require at least one session**

In `src/lib/validate.ts`, add to the `empty` list:
`[data.sessions.length === 0, 'no sessions loaded from src/content/sessions/'],`

In `tests/validate.test.ts`, in `reports every other empty source`, add `sessions: []` to the `siteData({...})` call and `'no sessions loaded from src/content/sessions/'` to the expected array.

- [ ] **Step 11: Fail on duplicate ids (Review Focus 5)**

In `scripts/verify-anchors.mjs`, move `let broken = 0;` above the `for (const file of walk(DIST))` loop and replace the `pages.set(...)` line with:

```js
  const ids = selectAll('[id]', tree).map((e) => String(e.properties.id));
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) {
    broken += 1;
    console.error(`✗ ${url}: id "${id}" is used more than once`);
  }
  pages.set(url, new Set(ids));
```

Update the header comment to add ", and no page may use an id twice".

- [ ] **Step 12: Let `Doc` carry outcomes and the session kind**

`src/layouts/Doc.astro`:
- Props: `lede?: string;`, then add `/** A session's expected outcomes, shown in the masthead. */ outcomes?: string[];`, and change `kind` to `'idea' | 'agenda' | 'register' | 'session'`.
- `const { title, kicker, kind, outcomes = [] } = Astro.props;` and `const lede = Astro.props.lede ? interpolateFacts(Astro.props.lede, facts) : undefined;`
- `<Base title={title} description={lede ?? title} kind={kind}>`
- In the masthead, replace `<p class="lede">{lede}</p>` with `{lede && <p class="lede">{lede}</p>}`, and after the `meta` line add:

```astro
      {outcomes.length > 0 && (
        <div class="outcomes">
          <p class="label">Expected outcomes</p>
          <ul>{outcomes.map((o) => <li>{o}</li>)}</ul>
        </div>
      )}
```

`src/layouts/Base.astro`:
- `kind: 'home' | 'idea' | 'agenda' | 'register' | 'session';`
- Make the first entry of `links` `...data.sessions.map((s) => ({ href: `/sessions/${s.slug}/`, label: s.short })),`

- [ ] **Step 13: Create the session page**

Create `src/pages/sessions/[slug].astro`:

```astro
---
import { getCollection, render } from 'astro:content';
import Doc from '../../layouts/Doc.astro';
import Section from '../../components/Section.astro';
import QuestionItem from '../../components/QuestionItem.astro';
import { loadSiteData } from '../../lib/data';
import { stillOpen } from '../../lib/sessions';

export async function getStaticPaths() {
  const data = await loadSiteData();
  return data.sessions.map((session) => ({ params: { slug: session.slug }, props: { slug: session.slug } }));
}

const data = await loadSiteData();
const session = data.sessions.find((s) => s.slug === Astro.props.slug)!;
const materials = new Map((await getCollection('topics')).map((entry) => [entry.id, entry]));
const questionById = new Map(data.questions.map((q) => [q.id, q]));
const decisionById = new Map(data.decisions.map((d) => [d.id, d]));
const topics = await Promise.all(session.topics.map(async (topic) => {
  const entry = materials.get(`${session.slug}/${topic.id}`);
  return {
    ...topic,
    Material: entry ? (await render(entry)).Content : undefined,
    questions: topic.settles.map((id) => questionById.get(id)!),
    decisionItems: topic.decisions.map((id) => decisionById.get(id)!),
  };
}));
const n = (i: number) => String(i).padStart(2, '0');
const open = stillOpen(session, data.questions);
---
<Doc
  title={session.title}
  kicker={`Session ${session.order} · ${session.track}`}
  meta={[`Owner: ${session.owner}`]}
  outcomes={session.outcomes}
  kind="session"
>
  <Section n="01" id="agenda" title="Agenda">
    <ol class="agenda-list">
      {topics.map((t) => <li><a href={`#${t.id}`}>{t.agenda}</a> {t.prompt && <span class="st st-discussion">discussion</span>}</li>)}
    </ol>
  </Section>
  {topics.map(({ Material, ...t }, i) => (
    <Section n={n(i + 2)} id={t.id} title={t.agenda} nav={t.nav}>
      {Material ? <Material /> : <p class="sec-note prompt">No prepared material — for discussion.</p>}
      {t.see && <p class="see">See also <a href={t.see.href}>{t.see.label}</a></p>}
      {(t.questions.length > 0 || t.decisionItems.length > 0) && (
        <div class="settle">
          <h3>To settle here</h3>
          {t.questions.map((q) => <QuestionItem q={q} />)}
          {t.decisionItems.length > 0 && (
            <ul class="settle-decisions">{t.decisionItems.map((d) => <li>{d.id} — {d.title}</li>)}</ul>
          )}
        </div>
      )}
    </Section>
  ))}
  <Section n={n(topics.length + 2)} id="outcomes" title="Expected outcomes">
    <ul class="outcome-list">{session.outcomes.map((o) => <li>{o}</li>)}</ul>
    {open.toConfirm.length + open.toDecide.length === 0 && <p class="sec-note">Nothing from this session is still open.</p>}
    {open.toConfirm.length > 0 && (
      <>
        <h3>Still to confirm</h3>
        <ul class="open-list">{open.toConfirm.map((q) => <li>{q.id} {q.question}</li>)}</ul>
      </>
    )}
    {open.toDecide.length > 0 && (
      <>
        <h3>Still to decide</h3>
        <ul class="open-list">{open.toDecide.map((q) => <li>{q.id} {q.question}</li>)}</ul>
      </>
    )}
  </Section>
</Doc>
```

The closing lists show plain `ID question` text on purpose. The HTML pass links each ID, and a second `QuestionItem` would repeat its `<h3 id="…-title">` on the page.

- [ ] **Step 14: Add the styles**

Append to `src/styles/site.css`:

```css
.mast .outcomes{margin-top:22px;max-width:72ch}
.mast .outcomes .label{font-family:var(--mono);font-size:.6875rem;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft);margin:0 0 6px}
.mast .outcomes ul,.outcome-list,.open-list,.settle-decisions{margin:0 0 16px;padding-left:19px;max-width:78ch}
.mast .outcomes li,.outcome-list li,.open-list li,.settle-decisions li{margin:0 0 5px}
.agenda-list{padding-left:24px;max-width:80ch}
.agenda-list li{margin:0 0 9px}
.st-discussion{background:var(--warm-soft);color:var(--warm)}
.sec-note.prompt,p.moved{border-left:3px solid var(--warm);padding-left:12px}
p.moved{border-left-color:var(--accent);color:var(--ink-soft);font-size:.9375rem;max-width:74ch}
.see{font-size:.9375rem}
.settle{margin-top:28px}
.card.session{border-left:3px solid var(--accent)}
```

Append to `src/styles/present.css`: `html[data-mode="present"] main > p.moved{display:none}`.

- [ ] **Step 15: Put sessions first on the home page**

In `src/pages/index.astro`:
- `import { stillOpen } from '../lib/sessions';`, then `const data = await loadSiteData();` and `const facts = computeFacts(data);`.
- Lede: `The workshop sessions, the design material behind them, and the questions the pilot needs answered. Press <kbd>P</kbd> on any page to present it, and <kbd>/</kbd> to search.`
- Before the Ideas block:

```astro
      <h2 class="home-h">Sessions</h2>
      <div class="cards">
        {data.sessions.map((s) => {
          const open = stillOpen(s, data.questions);
          return (
            <a class="card session" href={`/sessions/${s.slug}/`}>
              <p class="kicker">Session {s.order} · {s.track}</p>
              <h3>{s.title}</h3>
              <p>Owner: {s.owner} · {s.topics.length} topics · {open.toConfirm.length + open.toDecide.length} to settle</p>
            </a>
          );
        })}
      </div>
```

- Rename the heading `Ideas` to `Reference material`.

- [ ] **Step 16: Remove the placeholders and run everything**

```bash
git rm -q src/content/sessions/.gitkeep src/content/topics/.gitkeep
pnpm test && pnpm check && pnpm build && pnpm verify
```

Expected: all green. Fidelity lists `✓ uc1:consumption:* (1 pre exact)` (now on `/sessions/proof-point-delivery/`), `✓ uc1:position:0`…, `✓ uc1:risks:0`…`8`, and `fidelity: ok`. Anchors: 0 broken and no duplicate ids.

- [ ] **Step 17: Look at it**

Start `pnpm preview` (or reuse the one on :4321 after rebuilding). With Playwright, open `/sessions/proof-point-delivery/` at 1440×900 and 390×844 and check:
- 10 index entries (Agenda, 8 topics, Expected outcomes).
- The prompt topic shows the discussion chip and the prompt line.
- `document.documentElement.scrollWidth <= window.innerWidth` at 390.
- Press `P` and step with the arrow keys: 11 slides (masthead, agenda, 8 topics, outcomes).

Also check that the home page lists the session and that `/ideas/uc1-solution-architecture/` starts with the note and has 9 sections.

- [ ] **Step 18: Commit**

```bash
git add -A sources/workshop-agenda.md tests src scripts data
git commit -m "Add the session page and move Session 1 into it

Cross-channel proof point delivery now has its own page: the agenda
bullets, the UC1 material for each, the questions and decisions to
settle there, and the expected outcomes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Session 2 — NBA hand-off

**Files:**
- Create: `src/content/sessions/nba-hand-off.yaml`
- Create: `src/content/topics/nba-hand-off/{variant-metadata,taxonomy,payload}.mdx`
- Modify: `src/content/ideas/uc1-solution-architecture.mdx`, `scripts/fidelity-allowlist.json`, `data/questions.yaml`, `tests/build-errors.test.ts`

**Interfaces:**
- Consumes: the session page, the risk-table markup (Task 3) and the `see` field (Task 2).
- Produces: `/sessions/nba-hand-off/`. UC1 reduced to authoring, validation, sizing, open questions and two risks.

- [ ] **Step 1: Add the YAML**

Create `src/content/sessions/nba-hand-off.yaml`:

```yaml
title: "NBA hand-off: variant metadata, payload and feedback loop"
short: NBA hand-off
track: Cross-channel proof points
owner: Globant w/ Contentful
order: 2
outcomes:
  - High-level understanding of how NBA would read content data and metadata from the platform
  - Considerations for a future NBA build identified
  - NBA follow-ups logged (NBA Engineering not attending)
topics:
  - agenda: How NBA reads variant metadata to choose a proof point variant
    id: variant-metadata
    nav: Variant metadata
    settles: [Q2, Q17]
    decisions: [D-02]
  - agenda: Shared taxonomy between the CMS and NBA
    id: taxonomy
    nav: Shared taxonomy
    settles: [Q6b]
    decisions: [D-05]
  - agenda: Contents of the notification payload sent to channels
    id: payload
    nav: Notification payload
    settles: [Q1, Q3, Q16, Q20]
    decisions: [D-01, D-03]
  - agenda: Reporting the served variant back to NBA, including fallbacks
    id: served-variant
    nav: Served variant
    settles: [Q15]
    prompt: true
    see:
      href: /sessions/proof-point-delivery/#flow
      label: "Session 1: the served-variant event, interaction 9 of the consumption flow"
```

Run: `pnpm test tests/agenda-source.test.ts`
Expected: PASS for both files.

- [ ] **Step 2: Build the topic files**

`topics/nba-hand-off/variant-metadata.mdx`:
1. The §01 Q2 block (`<span class="stamp">Q2</span>NBA selects the variant`), keeping `data-origin="uc1:position:2"`.
2. `<h3>Content model</h3>`, then the `uc1:model:*` block, cut whole. First line of the file: `import uc1Fragment1 from '../../fragments/uc1-1.html?raw';`, then a blank line.
3. `<h3>Alternatives considered</h3>`, then the §12 block `uc1:alternatives:3` (Contentful resolving segment and tone).
4. The Task 3 risk table with row 5 (NBA cannot consume the variant index).

`topics/nba-hand-off/taxonomy.mdx`:
1. The §01 Q6b block (`uc1:position:5`), with the rewording in Step 3.
2. From §03 `ref`, the blocks from `<h3>Segment, tone and channel are not the same kind of thing</h3>` to the section's last `<p>`, each marked in order: the `h3` `data-origin="uc1:ref:3"`, the `p` `:4`, the `div.scroll` `:5`, and the four `p`s `:6`–`:9`.
3. `<h3>Alternatives considered</h3>`, then the §12 block `uc1:alternatives:0` (tone and channel as a single dimension).

`topics/nba-hand-off/payload.mdx`. First line: `import uc1Fragment2 from '../../fragments/uc1-2.html?raw';`, then a blank line, then:
1. The §01 Q1 block (`uc1:position:1`, already reworded in Task 3) and the Q3 block (`uc1:position:3`).
2. `<h3>The content reference</h3>`, then §03's first three blocks: the `p.sec-note` with `data-origin="uc1:ref:0"`, `<div data-origin="uc1:ref:1"><Fragment set:html={uc1Fragment2} /></div>` and the `ul.tight` with `data-origin="uc1:ref:2"`.
3. `<h3>Alternatives considered</h3>`, then the §12 blocks `uc1:alternatives:2` (one entry per partner) and `uc1:alternatives:4` (opaque hashed ID).

- [ ] **Step 3: Reword and retire**

| Origin | In the MDX, replace | with | Allowlist |
|---|---|---|---|
| `uc1:position:5` | `Section 03 sets the four dimensions out side by side.` | `The table below sets the four dimensions out side by side.` | `from` = the replaced text, `to` = the new text, `reason` = "The dimensions table now follows this block in the same topic" |
| `uc1:position:0` | *(delete the block)* | — | `{ "origin": "uc1:position:0", "retire": true, "reason": "The six positions now sit with the session topic each one answers, so a note introducing them together no longer applies" }` |

- [ ] **Step 4: Tidy UC1**

- Delete the now-empty sections `position`, `model`, `ref` and `alternatives`, and the imports `uc1Fragment1` and `uc1Fragment2`.
- Renumber the remaining sections `n="01"`…`n="05"`: authoring, validation, sizing, open, risks.
- Replace the `p.moved` note with:
  `<p class="moved">The delivery pattern and the Content Resolution API are presented in <a href="/sessions/proof-point-delivery/">Session 1</a>, and the NBA hand-off, the content model and the content reference in <a href="/sessions/nba-hand-off/">Session 2</a>. The authoring flow, the validation plan, the POC sizing, the design questions and two risks remain here.</p>`

- [ ] **Step 5: Unplace Q1, Q2, Q3 and Q6b**

```bash
node -e "
const fs = require('fs'); const f = 'data/questions.yaml';
fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/\n  idea: uc1-solution-architecture\n  section: position(?=\n)/g, ''));"
grep -c 'idea:' data/questions.yaml
```

Expected: `0`.

- [ ] **Step 6: Retarget the build test that used `section: position`**

In `tests/build-errors.test.ts`, change the planted edit of `fails when a question points at a section that does not exist` to:

```ts
    const { status, output } = buildWith(() => edit('data/questions.yaml', '- id: Q4\n', '- id: Q4\n  idea: uc1-solution-architecture\n  section: nowhere\n'));
```

- [ ] **Step 7: Run everything**

Run: `pnpm test && pnpm check && pnpm build && pnpm verify`
Expected: all green, and fidelity shows `✓ uc1:position:0 retired`.

- [ ] **Step 8: Look at it**

With Playwright at 1440 and 390, open `/sessions/nba-hand-off/` and check:
- 6 index entries.
- `served-variant` shows the discussion chip, the prompt line and a "See also" link that lands on Session 1 `#flow`.
- No horizontal overflow.

Then open `/ideas/uc1-solution-architecture/` and check it has 5 sections.

- [ ] **Step 9: Commit**

```bash
git add -A src scripts data tests
git commit -m "Move the NBA hand-off into Session 2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Session 3 — Partner web display layer

**Files:**
- Create: `src/content/sessions/partner-web-display-layer.yaml`, `src/content/topics/partner-web-display-layer/components.mdx`
- Modify: `src/content/ideas/uc2-content-model.mdx`

**Interfaces:**
- Consumes: everything from Tasks 2–3.
- Produces: `/sessions/partner-web-display-layer/`.

- [ ] **Step 1: Add the YAML**

Create `src/content/sessions/partner-web-display-layer.yaml`:

```yaml
title: Partner web display layer and front end architecture
short: Partner web
track: Partner web content
owner: ContenExceltful w/ Globant
order: 3
outcomes:
  - Display layer architecture and ownership understood
  - Split of self-serve versus engineering work agreed
  - Hosting and security requirements identified for EG review
topics:
  - agenda: "Front end approach: who builds, hosts and maintains it"
    id: front-end
    nav: Front end approach
    settles: [Q8, Q10]
    prompt: true
  - agenda: Rendering, caching and page performance
    id: rendering
    nav: Rendering and caching
    settles: [U1]
    prompt: true
    see:
      href: /sessions/proof-point-delivery/#performance
      label: "Session 1: where the cache sits"
  - agenda: Live preview and visual editing
    id: preview
    nav: Live preview
    prompt: true
  - agenda: Mapping content types to front end components and the design system, including the 2027 brand refresh
    id: components
    nav: Components and design system
    settles: [Q9, U2, U3, U4, U8]
  - agenda: What Web Ops can change without engineering versus what needs a developer
    id: self-serve
    nav: Self-serve vs. engineering
    settles: [U9]
    prompt: true
  - agenda: Running multiple partner sites from one instance
    id: multi-site
    nav: Multiple partner sites
    settles: [U5]
    prompt: true
  - agenda: SEO, tracking, consent, accessibility and EG security requirements
    id: requirements
    nav: SEO, consent, security
    settles: [U7, U10]
    decisions: [D-24]
    prompt: true
```

Run: `pnpm test tests/agenda-source.test.ts`
Expected: PASS for all three files.

- [ ] **Step 2: Move the front-end paragraph**

Create `topics/partner-web-display-layer/components.mdx`:

```mdx
import Fact from '../../../components/Fact.astro';

<p data-origin="uc2:summary:3">…the UC2 §01 paragraph starting "Every content type has a matching component in the Next.js and Tailwind front end", cut from UC2, unchanged…</p>

<p class="sec-note">The content types themselves are in the <a href="/ideas/uc2-content-model/#types">UC2 content model</a>.</p>
```

In `src/content/ideas/uc2-content-model.mdx` §01 `summary`, delete the `uc2:summary:*` wrapper and mark the remaining blocks: `<div class="stat" data-origin="uc2:summary:0">`, the three `<p>`s `:1`, `:2` and `:4`. Where the paragraph was, put:
`<p class="moved">How these types map to front-end components is discussed in <a href="/sessions/partner-web-display-layer/#components">Session 3</a>.</p>`

- [ ] **Step 3: Run everything**

Run: `pnpm test && pnpm check && pnpm build && pnpm verify`
Expected: all green. `/decide/` now shows "Discussed in Partner web › …" for U1–U5 and U7–U10, and "UC2" for U6 and U11.

- [ ] **Step 4: Look at it**

With Playwright at 1440 and 390, open `/sessions/partner-web-display-layer/` and check:
- 9 index entries, six topics with the discussion chip, and a "See also" link on `rendering`.
- No horizontal overflow.

In the top bar at 390, check that `Delivery · NBA hand-off · Partner web · UC1 · UC2 · Decide · …` wraps without overlapping.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "Add Session 3, the partner web display layer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Build-failure tests, docs and a full walk-through

**Files:**
- Modify: `tests/build-errors.test.ts`, `CLAUDE.md`

- [ ] **Step 1: Add the build-failure cases (Review Focus 3)**

In `tests/build-errors.test.ts`, add `renameSync` to the `node:fs` import and, inside the `describe`:

```ts
  it('fails when a session settles a question that does not exist', () => {
    const { status, output } = buildWith(() => edit('src/content/sessions/proof-point-delivery.yaml', 'settles: [Q6, Q22, DQ-4]', 'settles: [Q6, Q99, DQ-4]'));
    expect(status).not.toBe(0);
    expect(output).toContain('proof-point-delivery/sfmc: settles unknown question Q99');
  });

  it('fails on a YAML syntax error in a session file, naming the file', () => {
    const { status, output } = buildWith(() => edit('src/content/sessions/nba-hand-off.yaml', 'order: 2', 'order: [2'));
    expect(status).not.toBe(0);
    expect(output).toContain('nba-hand-off.yaml');
  });

  it('fails when a topic file does not match its topic id', () => {
    const { status, output } = buildWith(() => {
      const topics = path.join(dir!, 'src/content/topics/proof-point-delivery');
      renameSync(path.join(topics, 'failure.mdx'), path.join(topics, 'fallback.mdx'));
    });
    expect(status).not.toBe(0);
    expect(output).toContain('proof-point-delivery/failure: no material');
    expect(output).toContain('no session declares topic proof-point-delivery/fallback');
  });
```

Run: `pnpm test tests/build-errors.test.ts`
Expected: PASS (7 cases).

- [ ] **Step 2: Document it**

In `CLAUDE.md`:
- Architecture, first bullet: add "sessions (`src/content/sessions/<slug>.yaml`, inline loader) and topic material (`src/content/topics/<session>/<topic>.mdx`)" to the list of collections.
- New Architecture bullet: **Sessions.** `/sessions/<slug>/` walks the session's `topics` in agenda order. For each it renders the topic's MDX (or the discussion prompt when `prompt: true`), the optional `see` link, and the questions in `settles` and decisions in `decisions` under "To settle here". The last section lists the expected outcomes and what `stillOpen` leaves on the agenda. A question is settled in one topic at most, and a settled question carries no `idea`/`section`. "Discussed in" comes from `discussedIn()`.
- Gotchas, replacing the fidelity line: "`scripts/verify-fidelity.mjs` rebuilds every original section (commit `6c8dd77`) from the `data-origin="<doc>:<section>:<piece|*>"` blocks on the built site, wherever they live. Moving a block keeps its origin. Splitting a section means marking each piece (`--pieces <doc>:<section>` lists them). A wording change or a retired piece needs an entry in `scripts/fidelity-allowlist.json`, keyed by origin."
- New subsection **Adding a session**:
  1. Paste the agenda text into `sources/workshop-agenda.md`.
  2. Write `src/content/sessions/<slug>.yaml`, copying every line literally (`tests/agenda-source.test.ts` checks it).
  3. Add one MDX per topic with material, moving blocks with their `data-origin`.
  4. Take `idea`/`section` off the questions it settles.
  5. Run `pnpm test && pnpm build && pnpm verify`.
- Known couplings: add "The session 3 owner is copied as written in the agenda ('ContenExceltful'). Confirm the spelling with the agenda owner before the workshop, and change it in the YAML and the source together."

- [ ] **Step 3: Full walk-through**

Run: `pnpm test && pnpm check && pnpm build && pnpm verify`

Then, with Playwright on the built site:
- Home, the three sessions, UC1, UC2, `/decide/` and the three registers at 1440 and 390: no horizontal overflow, and no console errors.
- Presentation mode on Session 1 from the first slide to the last, and back.
- Search (`/`) for `consistencyKey`: the results include `/sessions/proof-point-delivery/` (Session 2 and UC1 §validation mention it too).
- Search for `DQ-9`: the ID shortcut goes to the register.

- [ ] **Step 4: Commit**

```bash
git add tests/build-errors.test.ts CLAUDE.md
git commit -m "Prove bad session data fails the build; document sessions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
