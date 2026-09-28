# Astro Workshop Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three HTML deliverables with one static Astro site that presents the UC1 and UC2 ideas and runs a decision agenda at the EG / CF / GL workshop.

**Architecture:** Every fact lives in one data source (`data/questions.yaml`, `decisions/*.md`, `model/uc2-matrix.json`, `sources/component-inventory.md`), loaded through Astro content collections and validated with zod. Pages render from `loadSiteData()`. A single middleware pass over the rendered HTML links every known ID and builds each page's index. Three small vanilla scripts add tooltips, presentation mode and Pagefind search.

**Tech Stack:** Astro 7.3 (static output), @astrojs/mdx 8, TypeScript 6, Vitest 5, Pagefind 1.5, hast utilities (`hast-util-from-html`, `hast-util-to-html`, `hast-util-select`), `yaml`, `@fontsource` IBM Plex.

**Spec:** `docs/superpowers/specs/2026-09-28-astro-workshop-site-design.md` (rev. 3). Read §0, "Implementation findings", first: it records what probing Astro 7 changed.

## Global Constraints

- Node ≥ 22.12.0 (the machine has 24.x), pnpm.
- `astro@^7.3.5`, `@astrojs/mdx@^8.0.2`, `typescript@^6` (not 7: `@astrojs/check` peers on `^5 || ^6`), `vitest@^5`, `pagefind@^1.5`.
- Site content and UI in English.
- Client-facing terminology: never "rejected" or "reclassified" in visible text. Components are *unified*, *kept distinct*, or *structural*.
- Stable IDs, never renumber: `C001–C035`, `CT01–CT23`, `Q1–Q26`, `Q6b`, `DQ-1–DQ-10`, `U1–U11`, `D-NN`.
- Every number that has a data source is computed: `<Fact k="…"/>` in MDX bodies, and `{{key}}` in frontmatter strings and `Section` titles.
- `markdown.smartypants: false`. The originals use straight quotes, and smartypants breaks fidelity.
- `trailingSlash: 'always'`. Every internal link ends in `/` before any `#`.
- Layouts work at 390 px with no horizontal page scroll. Wide tables and figures scroll inside `.scroll` / `.fig`.
- `sources/` is read-only. `exports/*.xlsx` is only ever regenerated with `make xlsx`. `decisions/` is append-only.
- No UI framework. Client JavaScript is limited to `src/scripts/{tooltips,present,search}.ts`.
- The inventory's analyst notes ("QUESTION FOR THE ANALYST", "Rejected components") are never published.
- One-off migration scripts live in `.migrate/`, which is gitignored and never committed.
- Without a TTY, `astro dev` detaches as a daemon. Stop it with `pnpm astro dev stop`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on branch `feat/astro-site`. The pre-migration commit is `6c8dd77`: scripts read the original documents from it with `git show`.

## Review Focus

1. **IDs next to punctuation in real prose** (`CT18+CT21`, `Q1–Q26`, `(DQ-9)`, `C021,`, `DQ-9.`, `Q6b` next to `Q6`): each ID is linked on its own, and the surrounding text is unchanged. Pinned in Task 4, test "links IDs next to punctuation".
2. **Keys pressed while typing** (Space, `P`, `T` or the arrows inside the search box or another field): they type into the field, and the slide neither advances nor toggles. Pinned in Task 12, `isEditableTarget` tests.
3. **`<pre>` whitespace through MDX plus the middleware re-serialisation:** the box-drawing layout survives byte for byte. Pinned in Task 5, test "preserves pre whitespace exactly", and in Task 8 by the exact-pre check in `verify-fidelity`.
4. **Post-workshop data typos** (misspelt status, `resolves` pointing at a non-existent question, a repeated id in the YAML, the same `D-NN` in two files, `assumed` without a position): the build fails with a message naming the ID and the source. Pinned in Task 3, schema and validation tests.
5. **ID search variants** (`dq-9 `, `q6B`) resolve to the canonical ID, and search under `astro dev` with no index shows a notice instead of throwing. Pinned in Task 13, `matchId` tests, plus a manual check.

---

## File map

```
package.json, pnpm-lock.yaml, astro.config.mjs, tsconfig.json, vitest.config.ts   Task 1
.gitignore (modify)                                                               Task 1
.migrate/extract.mjs  (gitignored)                                                Task 2
.migrate/convert.mjs  (gitignored)                                                Task 8
data/questions.yaml                                                               Task 2
decisions/D-01.md … D-25.md                                                       Task 2
model/uc2-matrix.json (modify), exports/EG-UC2-content-model-matrix.xlsx (regen)  Task 2
docs/superpowers/migration-discrepancies.md                                       Task 2
src/lib/types.ts, schemas.ts, inventory.ts, validate.ts, data.ts                  Task 3
src/content.config.ts                                                             Task 3
src/lib/ids.ts, registry.ts, linkify.ts                                           Task 4
src/lib/enhance.ts, src/middleware.ts                                             Task 5
src/lib/facts.ts, agenda.ts, status.ts                                            Task 6
src/styles/tokens.css, prose.css, site.css                                        Task 7
src/layouts/Base.astro, Doc.astro                                                 Task 7
src/components/Section.astro, Fact.astro                                          Task 7
src/pages/index.astro                                                             Task 7
src/content/ideas/*.mdx, src/content/fragments/*.html                             Task 8
src/components/ContentTypeTable.astro, src/pages/ideas/[slug].astro               Task 8
scripts/verify-fidelity.mjs, scripts/fidelity-allowlist.json                      Task 8
src/components/QuestionItem.astro, StatusChip.astro                               Task 9
src/pages/registers/{questions,decisions,inventory}.astro                         Task 9
scripts/verify-anchors.mjs                                                        Task 9
src/pages/decide.astro                                                            Task 10
src/scripts/tooltips.ts                                                           Task 11
src/lib/present-keys.ts, src/scripts/present.ts, src/styles/present.css           Task 12
src/lib/search-id.ts, src/components/SearchModal.astro, src/scripts/search.ts     Task 13
README.md, CLAUDE.md (rewrite); docs/*.html, decisions/*.md registers (delete)    Task 14
tests/*.test.ts, tests/fixtures.ts                                                Tasks 3–13
```

---

### Task 1: Scaffold the Astro project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/pages/index.astro`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `pnpm dev|build|preview|check|test`, and a working static build into `dist/`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "eg-cms-pilot-workshop",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run --passWithNoTests"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
pnpm add astro@^7.3.5 @astrojs/mdx@^8.0.2 yaml hast-util-from-html hast-util-to-html @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
pnpm add -D typescript@^6 @astrojs/check vitest hast-util-select @types/hast pagefind
```
Expected: both commands end with `Done`. The only acceptable warning is an unmet peer on a transitive package. If `@astrojs/check` reports an unmet TypeScript peer, the `typescript@^6` pin was lost, so re-run the second command.

- [ ] **Step 3: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  trailingSlash: 'always',
  // The source documents use straight quotes; smartypants would rewrite them and break fidelity.
  markdown: { smartypants: false },
});
```

- [ ] **Step 4: Create `tsconfig.json` and `vitest.config.ts`**

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules", ".migrate"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 5: Append to `.gitignore`**

```
# astro
node_modules/
dist/
.astro/

# one-off migration scripts, never committed
.migrate/
```

- [ ] **Step 6: Create a stub `src/pages/index.astro`** (Task 7 replaces it)

```astro
---
---
<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>Workshop</title></head>
<body><h1>Workshop</h1></body></html>
```

- [ ] **Step 7: Verify build, check and test**

Run: `pnpm build && pnpm check && pnpm test`
Expected: `1 page(s) built`, `0 errors`, and Vitest exits 0 with "No test files found".

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs tsconfig.json vitest.config.ts .gitignore src/pages/index.astro
git commit -m "Scaffold the Astro workshop site

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Extract the data (one-off)

**Files:**
- Create (gitignored): `.migrate/extract.mjs`
- Create: `data/questions.yaml`, `decisions/D-01.md … D-09.md`, `decisions/D-20.md … D-25.md`, `docs/superpowers/migration-discrepancies.md`
- Modify: `model/uc2-matrix.json`, `exports/EG-UC2-content-model-matrix.xlsx` (regenerated)

**Interfaces:**
- Produces:
  - `data/questions.yaml`: a list of 37 question records with fields `id, group, question, detail?, why?, owner?, status, position?, answer?, confirmedByEG, idea?, section?`.
  - `decisions/D-NN.md`: 15 files, each with frontmatter `id, title, useCase, resolves: []`.
  - `model/uc2-matrix.json`: `open_questions` becomes U1–U11, each with `id, question, blocks, owner, status, confirmedByEG, position?`, and every `components[]` entry gains `summary`.

- [ ] **Step 1: Write `.migrate/extract.mjs`**

```js
// One-off migration: builds data/questions.yaml and decisions/D-*.md, updates
// model/uc2-matrix.json and writes the discrepancy file. It reads the original
// documents from git, so it still works after they are deleted.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { fromHtml } from 'hast-util-from-html';
import { select, selectAll } from 'hast-util-select';
import YAML from 'yaml';

const BASE = '6c8dd77';
const git = (p) => execSync(`git show ${BASE}:${p}`, { encoding: 'utf8', maxBuffer: 1 << 26 });
const text = (node) => {
  let s = '';
  (function walk(n) { if (n.type === 'text') s += n.value; (n.children ?? []).forEach(walk); })(node);
  return s.replace(/\s+/g, ' ').trim();
};
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// ---- Doc 01 question blocks: wording, reasoning (.qb) and the "why" note
const doc01 = fromHtml(git('docs/01-pilot-backlog.html'));
const blocks = new Map();
for (const block of selectAll('#questions div.q', doc01)) {
  const id = text(select('.qid', block));
  const qt = select('.qt', block);
  qt.children = qt.children.filter((c) => !(c.type === 'element' && c.properties?.className?.includes('tag')));
  const why = select('.why', block);
  blocks.set(id, { question: text(qt), detail: text(select('.qb', block)), why: why ? text(why) : undefined });
}
assert(blocks.size === 27, `expected 27 question blocks in doc 01, found ${blocks.size}`);

// ---- Register tables
const GROUPS = [
  ['Blocking', 'blocking'], ['Scope boundaries', 'scope'], ['Inputs and dependencies', 'inputs'],
  ['Commercial and evaluation', 'commercial'], ['UC1 design questions', 'uc1-design'],
  ['UC2 content model questions', 'uc2-model'], ['Answered', 'answered'],
];
const rows = [];
let group;
for (const raw of git('decisions/open-questions.md').split('\n')) {
  const line = raw.trim();
  const heading = line.match(/^## (.+)$/);
  if (heading) { group = GROUPS.find(([prefix]) => heading[1].startsWith(prefix))?.[1]; continue; }
  if (!group || !line.startsWith('|')) continue;
  const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  if (cells[0] === 'ID' || cells[0] === '#' || /^-+$/.test(cells[0])) continue;
  rows.push({ group, cells });
}
const answers = new Map(rows.filter((r) => r.group === 'answered').map((r) => [r.cells[0], r.cells[2]]));

const UC1_POSITION_QUESTIONS = new Set(['Q1', 'Q2', 'Q3', 'Q6b']);
const Q5_POSITION = 'The Content Resolution API assembles it: plain substitution of the parameters into the localised message pattern (D-04, D-06).';
const NOT_A_POSITION = /^(none\b|undecided$)/i;
const titleDiffs = [];
const questions = [];
for (const { group: g, cells } of rows) {
  if (g === 'answered' || g === 'uc2-model') continue;
  if (g === 'uc1-design') {
    const [id, question, assumption, status] = cells;
    questions.push(clean({
      id, group: g, question, status,
      position: NOT_A_POSITION.test(assumption) ? undefined : assumption,
      confirmedByEG: false, idea: 'uc1-solution-architecture', section: 'open',
    }));
    continue;
  }
  const [id, registerQuestion, owner, status] = cells;
  const block = blocks.get(id);
  assert(block, `register question ${id} has no block in doc 01`);
  if (block.question !== registerQuestion) titleDiffs.push({ id, doc: block.question, register: registerQuestion });
  questions.push(clean({
    id, group: g, question: block.question, detail: block.detail, why: block.why, owner, status,
    position: id === 'Q5' ? Q5_POSITION : undefined,
    answer: answers.get(id), confirmedByEG: false,
    idea: UC1_POSITION_QUESTIONS.has(id) ? 'uc1-solution-architecture' : undefined,
    section: UC1_POSITION_QUESTIONS.has(id) ? 'position' : undefined,
  }));
}
assert(questions.filter((q) => q.id.startsWith('DQ-')).length === 10, 'expected 10 DQ questions');
assert(questions.filter((q) => /^Q/.test(q.id)).length === 27, 'expected 27 Q questions');
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/questions.yaml', [
  '# Q1–Q26 and Q6b (raised with EG) and DQ-1–DQ-10 (UC1 design).',
  '# UC2 questions U1–U11 live in model/uc2-matrix.json because they feed the workbook.',
  '# status: open | assumed | answered | closed. confirmedByEG becomes true once EG accepts the answer.',
  YAML.stringify(questions, { lineWidth: 0 }),
].join('\n'));

// ---- Decision log -> one file per decision
let useCase;
const decisions = [];
for (const chunk of git('decisions/decision-log.md').split(/^(?=## |### )/m)) {
  if (chunk.startsWith('## UC1')) { useCase = 'uc1'; continue; }
  if (chunk.startsWith('## UC2')) { useCase = 'uc2'; continue; }
  const m = chunk.match(/^### (D-\d+) · (.+)\n([\s\S]*)$/);
  if (!m) continue;
  decisions.push({ id: m[1], title: m[2].trim(), useCase, body: m[3].replace(/\n-{3,}\s*$/, '').trim() });
}
assert(decisions.length === 15, `expected 15 decisions, found ${decisions.length}`);
for (const d of decisions) {
  const front = YAML.stringify({ id: d.id, title: d.title, useCase: d.useCase, resolves: [] }, { lineWidth: 0 });
  fs.writeFileSync(`decisions/${d.id}.md`, `---\n${front}---\n\n${d.body}\n`);
}

// ---- UC2 questions (union, register IDs) and content-type summaries
const matrix = JSON.parse(fs.readFileSync('model/uc2-matrix.json', 'utf8'));
const find = (re) => {
  const q = matrix.open_questions.find((x) => re.test(x.question));
  assert(q, `no UC2 question matches ${re}`);
  return q;
};
const U3 = {
  question: 'Is the calculator formula authorable or in the front end?',
  blocks: 'CT23 spec',
  owner: 'EG product',
  position: 'Formula in the front end, copy in the CMS: the formula is selected by calculatorKey, and the labels and disclaimer are authored.',
};
const U = [
  ['U1', /Recommended for you/], ['U2', /^Lead capture form/], ['U3', null],
  ['U4', /^Comparison table on mobile/], ['U5', /URL slugs/], ['U6', /different imagery/],
  ['U7', /OneTrust/], ['U8', /third level/], ['U9', /Which roles may place/],
  ['U10', /data layer/], ['U11', /Which Contentful plan/],
];
assert(matrix.open_questions.length === 10, 'expected 10 UC2 questions before the union');
matrix.open_questions = U.map(([id, re]) => {
  const { question, blocks: blk, owner, position } = re ? find(re) : U3;
  return clean({ id, question, blocks: blk, owner, status: id === 'U3' ? 'assumed' : 'open', confirmedByEG: false, position });
});
const doc03 = fromHtml(git('docs/03-uc2-content-model.html'));
for (const tr of selectAll('#types tbody tr', doc03)) {
  const cells = selectAll('td', tr).map(text);
  const ct = matrix.components.find((c) => c.id === cells[0]);
  assert(ct, `doc 03 lists unknown content type ${cells[0]}`);
  ct.summary = cells[6];
}
assert(matrix.components.every((c) => c.summary), 'a content type has no summary');
fs.writeFileSync('model/uc2-matrix.json', JSON.stringify(matrix, null, 2));

// ---- Discrepancy file
const doc02Text = text(fromHtml(git('docs/02-uc1-solution-architecture.html')));
const backlogSentences = doc02Text.split(/(?<=[.!?])\s+/).filter((s) => /\bbacklog\b/.test(s));
assert(backlogSentences.length === 2, `expected 2 sentences mentioning the backlog in doc 02, found ${backlogSentences.length}`);
const ct23 = matrix.components.find((c) => c.id === 'CT23');
fs.writeFileSync('docs/superpowers/migration-discrepancies.md', `# Migration discrepancies

Places where the migration found two versions of the same fact, or had to fill a gap. The
migration applied the **default** shown for each one so the site builds; the owner confirms or
changes each before merge. Resolve an item by editing the source named, then tick it.

## 1. CT23 purpose — conflicting statements

- [ ] Resolved

- Doc 03 (now \`components[CT23].summary\`, shown on the site): "${ct23.summary}"
- Matrix JSON (\`components[CT23].purpose\`, shown in the workbook): "${ct23.purpose}"

The two disagree on whether the formula is authorable. U3 carries the same question.
**Default:** both kept as they are, which leaves the contradiction in place.

## 2. Doc 02 refers to "the backlog", which is no longer on the site

- [ ] Resolved

${backlogSentences.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

**Default:** text kept verbatim. Proposed rewording: drop the reference ("…this is the
hand-modelled route, and it is deliberate here rather than a fallback" / "This is where a
platform constraint bites: …"). An accepted change goes into
\`scripts/fidelity-allowlist.json\` with its reason.

## 3. Q8 — has EG confirmed the answer?

- [ ] Resolved

The register lists Q8 as answered ("Globant, Next.js and Tailwind, in scope for the user
story"), but never says whether EG confirmed it. **Default:** \`confirmedByEG: false\`, which
keeps Q8 on the agenda.

## 4. Q5 — position was not written down anywhere

- [ ] Resolved

The register marks Q5 as \`assumed\` without stating the assumption. **Default position**,
inferred from D-04 and D-06: "${Q5_POSITION}"

## 5. U3 — position taken from doc 03

- [ ] Resolved

**Default position:** "${U3.position}"

## 6. DQ-1 and DQ-9 — working assumption treated as "no position"

- [ ] Resolved

Their working assumptions ("none — estimates are order-of-magnitude", "undecided") are not
positions, so both sit under "to decide" on the agenda. The doc 02 table still shows the
text.

## 7. Question wording — doc 01 and the register differ

- [ ] Resolved

**Default:** doc 01's wording, the version written for the client.

| ID | Doc 01 (used) | Register |
| --- | --- | --- |
${titleDiffs.map((d) => `| ${d.id} | ${d.doc} | ${d.register} |`).join('\n')}

## 8. Anchor renamed (for information)

- [ ] Acknowledged

Doc 02's section id \`rejected\` becomes \`alternatives\`, because URL fragments are visible and
the terminology rule applies. The title "Alternatives considered" does not change.
`);

console.log(`questions: ${questions.length} · decisions: ${decisions.length} · UC2 questions: ${matrix.open_questions.length} · wording differences: ${titleDiffs.length}`);
```

- [ ] **Step 2: Run it**

Run: `mkdir -p .migrate && node .migrate/extract.mjs`
Expected: `questions: 37 · decisions: 15 · UC2 questions: 11 · wording differences: 11`

- [ ] **Step 3: Spot-check the outputs**

Run:
```bash
ls decisions/D-*.md | wc -l
head -30 data/questions.yaml
cat decisions/D-05.md
python3 -c "import json;d=json.load(open('model/uc2-matrix.json'));print([q['id'] for q in d['open_questions']]);print(d['components'][22]['summary'])"
make check
```
Expected:
- `15` decision files.
- Q1 carries `answer`, `idea: uc1-solution-architecture` and `section: position`.
- D-05 frontmatter has `useCase: uc1`, and its body starts with "Tone is a selection criterion".
- The ID list runs `U1` … `U11`, and the CT23 summary is "Interactive calculator; formula in code, copy in the CMS".
- `make check` prints `questions : 11` and `ids unique: ok`.

- [ ] **Step 4: Regenerate the workbook and confirm what changed**

Run:
```bash
make xlsx
python3 - <<'EOF'
import io, subprocess, openpyxl
old = openpyxl.load_workbook(io.BytesIO(subprocess.run(['git', 'show', 'HEAD:exports/EG-UC2-content-model-matrix.xlsx'], capture_output=True, check=True).stdout))
new = openpyxl.load_workbook('exports/EG-UC2-content-model-matrix.xlsx')
for name in new.sheetnames:
    a = [[c.value for c in r] for r in old[name].iter_rows()] if name in old.sheetnames else []
    b = [[c.value for c in r] for r in new[name].iter_rows()]
    print(('CHANGED ' if a != b else 'same    ') + name, len(a), '->', len(b))
EOF
```
Expected: only `Summary` (the open-questions count goes 10 → 11) and `Open Questions` (one more row, in U order) show `CHANGED`. If another sheet changed, stop: `build_xlsx.py` is reading a key this task added.

- [ ] **Step 5: Commit**

```bash
git add data/questions.yaml decisions/D-*.md model/uc2-matrix.json exports/EG-UC2-content-model-matrix.xlsx docs/superpowers/migration-discrepancies.md
git commit -m "Move questions and decisions into structured data

Q1-Q26, Q6b and DQ-1-DQ-10 go to data/questions.yaml with doc 01's
reasoning; the decision log splits into one file per decision; UC2
questions become U1-U11 in the matrix JSON (union of register and
JSON); content types gain doc 03's summary. Defaults for every
conflict are listed in migration-discrepancies.md.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Types, schemas, collections, validation and site data

**Files:**
- Create: `src/lib/types.ts`, `src/lib/schemas.ts`, `src/lib/inventory.ts`, `src/lib/validate.ts`, `src/lib/data.ts`, `src/content.config.ts`
- Create (stubs, replaced in Task 8): `src/content/ideas/uc1-solution-architecture.mdx`, `src/content/ideas/uc2-content-model.mdx`
- Modify: `src/pages/index.astro`
- Test: `tests/fixtures.ts`, `tests/schemas.test.ts`, `tests/inventory.test.ts`, `tests/validate.test.ts`

**Interfaces:**
- Produces:
  - Types: `Status`, `QuestionGroup`, `Question`, `Decision`, `ContentType`, `Consolidation`, `InventoryRow`, `InventoryComponent`, `IdeaMeta`, `SiteData`, `RegistryKind`, `RegistryEntry`, `Registry`.
  - Schemas: `STATUSES`, `GROUPS`, `ideaSchema`, `questionSchema`, `uc2QuestionSchema`, `decisionSchema`, `contentTypeSchema`, `consolidationSchema`, `inventorySchema`, `uniqueById(list, source)`.
  - `parseInventory(markdown: string): InventoryRow[]` and `linkInventory(rows, contentTypes): InventoryComponent[]`.
  - `findProblems(data: SiteData): string[]` and `assertValid(data: SiteData): void`.
  - `loadSiteData(): Promise<SiteData>` (Astro runtime only; validates cross-references).

- [ ] **Step 1: Create `src/lib/types.ts`**

```ts
export type Status = 'open' | 'assumed' | 'answered' | 'closed';
export type QuestionGroup = 'blocking' | 'scope' | 'inputs' | 'commercial' | 'uc1-design' | 'uc2-model';

export interface Question {
  id: string;
  group: QuestionGroup;
  question: string;
  detail?: string;
  why?: string;
  owner?: string;
  status: Status;
  position?: string;
  answer?: string;
  confirmedByEG: boolean;
  idea?: string;
  section?: string;
  blocks?: string;
}

export interface Decision {
  id: string;
  title: string;
  useCase: 'uc1' | 'uc2';
  resolves: string[];
}

export interface ContentType {
  id: string;
  name: string;
  layer: string;
  purpose: string;
  summary: string;
  complexity: 'S' | 'M' | 'L';
  reuse: number;
  propertyCount: number;
  consolidates: string[];
}

export interface Consolidation {
  candidates: string;
  decision: string;
  test: string;
  result: string;
}

export interface InventoryRow {
  id: string;
  name: string;
  type: string;
  variationOf: string | null;
  matrixStatus: string;
  reference: string | null;
  screens: string[];
}

export interface InventoryComponent extends InventoryRow {
  contentTypes: string[];
}

export interface IdeaMeta {
  slug: string;
  title: string;
  short: string;
  order: number;
}

export interface SiteData {
  ideas: IdeaMeta[];
  questions: Question[];
  decisions: Decision[];
  contentTypes: ContentType[];
  consolidation: Consolidation[];
  inventory: InventoryComponent[];
}

export type RegistryKind = 'question' | 'decision' | 'contentType' | 'component';

export interface RegistryEntry {
  id: string;
  kind: RegistryKind;
  label: string;
  status?: Status;
  confirmed?: boolean;
  href: string;
}

export type Registry = Map<string, RegistryEntry>;
```

- [ ] **Step 2: Write the failing schema tests** in `tests/schemas.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { questionSchema, uc2QuestionSchema, uniqueById } from '../src/lib/schemas';

describe('questionSchema', () => {
  const base = { id: 'Q5', group: 'blocking', question: 'Where is the sentence assembled?', status: 'open' };

  it('accepts a minimal open question and defaults confirmedByEG to false', () => {
    expect(questionSchema.parse(base).confirmedByEG).toBe(false);
  });
  it('rejects an assumed question without a position', () => {
    expect(questionSchema.safeParse({ ...base, status: 'assumed' }).success).toBe(false);
  });
  it('accepts an assumed question with a position', () => {
    expect(questionSchema.safeParse({ ...base, status: 'assumed', position: 'In the resolver' }).success).toBe(true);
  });
  it('rejects a misspelt status', () => {
    expect(questionSchema.safeParse({ ...base, status: 'answerd' }).success).toBe(false);
  });
  it('rejects an ID outside the Q and DQ families', () => {
    expect(questionSchema.safeParse({ ...base, id: 'U3' }).success).toBe(false);
  });
});

describe('uc2QuestionSchema', () => {
  it('applies the same position rule', () => {
    expect(uc2QuestionSchema.safeParse({ id: 'U3', question: 'Calculator?', status: 'assumed' }).success).toBe(false);
  });
});

describe('uniqueById', () => {
  it('returns the list when every id is unique', () => {
    expect(uniqueById([{ id: 'Q1' }, { id: 'Q2' }], 'data/questions.yaml')).toHaveLength(2);
  });
  it('names the source and the id when an id repeats', () => {
    expect(() => uniqueById([{ id: 'Q1' }, { id: 'Q1' }], 'data/questions.yaml')).toThrow('data/questions.yaml: duplicate id Q1');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm test tests/schemas.test.ts`
Expected: FAIL, because `../src/lib/schemas` cannot be resolved.

- [ ] **Step 4: Create `src/lib/schemas.ts`**

```ts
import { z } from 'astro/zod';

export const STATUSES = ['open', 'assumed', 'answered', 'closed'] as const;
export const GROUPS = ['blocking', 'scope', 'inputs', 'commercial', 'uc1-design', 'uc2-model'] as const;

const status = z.enum(STATUSES);
const POSITION_RULE = { message: 'an assumed question needs a position', path: ['position'] };
const hasPositionIfAssumed = (q: { status: string; position?: string }) => q.status !== 'assumed' || Boolean(q.position);

export const ideaSchema = z.object({
  title: z.string(),
  short: z.string(),
  kicker: z.string(),
  lede: z.string(),
  order: z.number(),
  meta: z.array(z.string()).default([]),
});

export const questionSchema = z
  .object({
    id: z.string().regex(/^(Q\d+b?|DQ-\d+)$/),
    group: z.enum(['blocking', 'scope', 'inputs', 'commercial', 'uc1-design']),
    question: z.string().min(1),
    detail: z.string().optional(),
    why: z.string().optional(),
    owner: z.string().optional(),
    status,
    position: z.string().optional(),
    answer: z.string().optional(),
    confirmedByEG: z.boolean().default(false),
    idea: z.string().optional(),
    section: z.string().optional(),
  })
  .refine(hasPositionIfAssumed, POSITION_RULE);

export const uc2QuestionSchema = z
  .object({
    id: z.string().regex(/^U\d+$/),
    question: z.string().min(1),
    blocks: z.string().optional(),
    owner: z.string().optional(),
    status,
    position: z.string().optional(),
    answer: z.string().optional(),
    confirmedByEG: z.boolean().default(false),
  })
  .refine(hasPositionIfAssumed, POSITION_RULE);

export const decisionSchema = z.object({
  id: z.string().regex(/^D-\d{2}$/),
  title: z.string(),
  useCase: z.enum(['uc1', 'uc2']),
  resolves: z.array(z.string()).default([]),
});

export const contentTypeSchema = z.object({
  id: z.string().regex(/^CT\d{2}$/),
  name: z.string(),
  layer: z.string(),
  purpose: z.string(),
  summary: z.string(),
  complexity: z.enum(['S', 'M', 'L']),
  reuse: z.number(),
  consolidates: z.array(z.string()),
  properties: z.array(z.unknown()),
});

export const consolidationSchema = z.object({
  candidates: z.string(),
  decision: z.string(),
  test: z.string(),
  result: z.string(),
});

export const inventorySchema = z.object({
  id: z.string().regex(/^C\d{3}$/),
  name: z.string(),
  type: z.string(),
  variationOf: z.string().nullable(),
  matrixStatus: z.string(),
  reference: z.string().nullable(),
  screens: z.array(z.string()),
});

/** Loader guard: a repeated id would otherwise overwrite the earlier entry silently. */
export function uniqueById<T extends { id: string }>(list: T[], source: string): T[] {
  const seen = new Set<string>();
  for (const item of list) {
    if (seen.has(item.id)) throw new Error(`${source}: duplicate id ${item.id}`);
    seen.add(item.id);
  }
  return list;
}
```

- [ ] **Step 5: Run the schema tests to verify they pass**

Run: `pnpm test tests/schemas.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Write `tests/fixtures.ts` and the failing inventory and validation tests**

`tests/fixtures.ts`:
```ts
import type { Question, SiteData } from '../src/lib/types';

export function question(overrides: Partial<Question> & Pick<Question, 'id'>): Question {
  return { group: 'scope', question: `Question ${overrides.id}?`, status: 'open', confirmedByEG: false, ...overrides };
}

export function siteData(overrides: Partial<SiteData> = {}): SiteData {
  return {
    ideas: [{ slug: 'uc1-solution-architecture', title: 'Use Case 1', short: 'UC1', order: 1 }],
    questions: [question({ id: 'Q1', group: 'blocking' }), question({ id: 'DQ-9', group: 'uc1-design' })],
    decisions: [{ id: 'D-05', title: 'Tone belongs to the partner', useCase: 'uc1', resolves: [] }],
    contentTypes: [{
      id: 'CT01', name: 'section', layer: 'Structural', purpose: 'Container', summary: 'Container',
      complexity: 'M', reuse: 34, propertyCount: 11, consolidates: ['C019 Background Section'],
    }],
    consolidation: [{ candidates: 'A, B', decision: 'Kept distinct', test: 't', result: 'r' }],
    inventory: [{
      id: 'C019', name: 'Background Section', type: 'Component', variationOf: null,
      matrixStatus: 'Existing', reference: 'ID 85', screens: ['P01'], contentTypes: ['CT01'],
    }],
    ...overrides,
  };
}
```

`tests/inventory.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { linkInventory, parseInventory } from '../src/lib/inventory';

const SAMPLE = `# Inventory

## Approved components (internal)

| ID | Component | Type | Variation of | Matrix status | Reference | Screens |
| --- | --- | --- | --- | --- | --- | --- |
| C008 | Image + Text Split Banner | Component | - | Existing | ID 6 | P01 Campaign landing page |
| C021 | Image + Text Split Banner (image on the right) | Component | C008 | Variation | ID 6 | P01 Campaign landing page |
| C009 | Comparison Table | Component | - | New candidate | - | P01 Campaign landing page, Global |

## Components pending validation

| C099 | Must not be read | x | - | x | - | x |
`;

describe('parseInventory', () => {
  it('reads the rows of the approved table only', () => {
    expect(parseInventory(SAMPLE).map((r) => r.id)).toEqual(['C008', 'C021', 'C009']);
  });
  it('turns "-" into null and splits screens', () => {
    const [, c021, c009] = parseInventory(SAMPLE);
    expect(c021.variationOf).toBe('C008');
    expect(c009.reference).toBeNull();
    expect(c009.screens).toEqual(['P01 Campaign landing page', 'Global']);
  });
  it('fails loudly when the heading is missing', () => {
    expect(() => parseInventory('# nothing here')).toThrow('Approved components (internal)');
  });
  it('fails loudly on a row with the wrong column count', () => {
    expect(() => parseInventory(SAMPLE.replace('| ID 6 | P01 Campaign landing page |\n| C021', '| P01 |\n| C021'))).toThrow('C008 has 6 columns');
  });
  it('reads all 35 components from the real inventory', () => {
    const rows = parseInventory(readFileSync('sources/component-inventory.md', 'utf8'));
    expect(rows).toHaveLength(35);
    expect(new Set(rows.map((r) => r.id)).size).toBe(35);
  });
});

describe('linkInventory', () => {
  it('maps a component to every content type that consolidates it', () => {
    const [row] = parseInventory(SAMPLE);
    const linked = linkInventory([row], [
      { id: 'CT08', consolidates: ['C008 Image + Text Split Banner', 'C021 Image right'] },
      { id: 'CT01', consolidates: ['C019 Background Section'] },
    ]);
    expect(linked[0].contentTypes).toEqual(['CT08']);
  });
  it('leaves an unmapped component with no content types', () => {
    const [, , c009] = parseInventory(SAMPLE);
    expect(linkInventory([c009], [])[0].contentTypes).toEqual([]);
  });
});
```

`tests/validate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { assertValid, findProblems } from '../src/lib/validate';
import { question, siteData } from './fixtures';

describe('findProblems', () => {
  it('finds nothing wrong with consistent data', () => {
    expect(findProblems(siteData())).toEqual([]);
  });
  it('reports the same decision ID in two files', () => {
    const data = siteData({ decisions: [
      { id: 'D-26', title: 'A', useCase: 'uc1', resolves: [] },
      { id: 'D-26', title: 'B', useCase: 'uc1', resolves: [] },
    ] });
    expect(findProblems(data)).toContain('duplicate ID D-26 (decisions and decisions)');
  });
  it('reports a question pointing at an idea that does not exist', () => {
    const data = siteData({ questions: [question({ id: 'Q7', idea: 'uc9-nothing' })] });
    expect(findProblems(data)).toContain('Q7: unknown idea "uc9-nothing"');
  });
  it('reports a section without an idea', () => {
    const data = siteData({ questions: [question({ id: 'Q7', section: 'open' })] });
    expect(findProblems(data)).toContain('Q7: section "open" without an idea');
  });
  it('reports a decision resolving an unknown question', () => {
    const data = siteData({ decisions: [{ id: 'D-26', title: 'A', useCase: 'uc1', resolves: ['Q27'] }] });
    expect(findProblems(data)).toContain('D-26: resolves unknown question Q27');
  });
});

describe('assertValid', () => {
  it('throws one error listing every problem', () => {
    const data = siteData({ decisions: [{ id: 'D-26', title: 'A', useCase: 'uc1', resolves: ['Q27', 'Q28'] }] });
    expect(() => assertValid(data)).toThrow(/Q27[\s\S]*Q28/);
  });
});
```

- [ ] **Step 7: Run them to verify they fail**

Run: `pnpm test tests/inventory.test.ts tests/validate.test.ts`
Expected: FAIL, because `../src/lib/inventory` and `../src/lib/validate` cannot be resolved.

- [ ] **Step 8: Create `src/lib/inventory.ts` and `src/lib/validate.ts`**

`src/lib/inventory.ts`:
```ts
import type { InventoryComponent, InventoryRow } from './types';

const HEADING = '## Approved components (internal)';
const COLUMNS = 7;
const dash = (value: string) => (value === '-' || value === '' ? null : value);

/** Reads the approved component table; the rest of the file (analyst notes) is ignored on purpose. */
export function parseInventory(markdown: string): InventoryRow[] {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === HEADING);
  if (start < 0) throw new Error(`component inventory: heading "${HEADING}" not found`);
  const rows: InventoryRow[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
    if (!/^C\d{3}$/.test(cells[0])) continue; // header and separator rows
    if (cells.length !== COLUMNS) throw new Error(`component inventory: ${cells[0]} has ${cells.length} columns, expected ${COLUMNS}`);
    const [id, name, type, variationOf, matrixStatus, reference, screens] = cells;
    rows.push({
      id, name, type, matrixStatus,
      variationOf: dash(variationOf),
      reference: dash(reference),
      screens: screens.split(',').map((s) => s.trim()).filter(Boolean),
    });
  }
  if (rows.length === 0) throw new Error('component inventory: no component rows found');
  return rows;
}

/** A content type lists the components it consolidates as "C019 Background Section". */
export function linkInventory(rows: InventoryRow[], contentTypes: { id: string; consolidates: string[] }[]): InventoryComponent[] {
  return rows.map((row) => ({
    ...row,
    contentTypes: contentTypes
      .filter((ct) => ct.consolidates.some((entry) => entry.split(' ')[0] === row.id))
      .map((ct) => ct.id),
  }));
}
```

`src/lib/validate.ts`:
```ts
import type { SiteData } from './types';

/** Cross-collection rules that per-entry zod schemas cannot express. */
export function findProblems(data: SiteData): string[] {
  const problems: string[] = [];
  const owners = new Map<string, string>();
  const claim = (id: string, where: string) => {
    const previous = owners.get(id);
    if (previous) problems.push(`duplicate ID ${id} (${previous} and ${where})`);
    else owners.set(id, where);
  };
  data.questions.forEach((q) => claim(q.id, 'questions'));
  data.decisions.forEach((d) => claim(d.id, 'decisions'));
  data.contentTypes.forEach((c) => claim(c.id, 'content types'));
  data.inventory.forEach((c) => claim(c.id, 'inventory'));

  const ideas = new Set(data.ideas.map((i) => i.slug));
  for (const q of data.questions) {
    if (q.idea && !ideas.has(q.idea)) problems.push(`${q.id}: unknown idea "${q.idea}"`);
    if (q.section && !q.idea) problems.push(`${q.id}: section "${q.section}" without an idea`);
  }
  const questionIds = new Set(data.questions.map((q) => q.id));
  for (const d of data.decisions) {
    for (const id of d.resolves) if (!questionIds.has(id)) problems.push(`${d.id}: resolves unknown question ${id}`);
  }
  return problems;
}

export function assertValid(data: SiteData): void {
  const problems = findProblems(data);
  if (problems.length > 0) throw new Error(`Site data is invalid:\n- ${problems.join('\n- ')}`);
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS for all three files.

- [ ] **Step 10: Create `src/content.config.ts` and `src/lib/data.ts`**

`src/content.config.ts`:
```ts
import { readFile } from 'node:fs/promises';
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import YAML from 'yaml';
import { parseInventory } from './lib/inventory';
import {
  consolidationSchema, contentTypeSchema, decisionSchema, ideaSchema,
  inventorySchema, questionSchema, uc2QuestionSchema, uniqueById,
} from './lib/schemas';

const MATRIX = './model/uc2-matrix.json';
const matrixPart = (key: 'open_questions' | 'components') => (text: string) =>
  uniqueById(JSON.parse(text)[key], `${MATRIX} ${key}`);

export const collections = {
  ideas: defineCollection({ loader: glob({ pattern: '*.mdx', base: './src/content/ideas' }), schema: ideaSchema }),
  // glob ids are lower-cased file names; always use data.id for the decision ID.
  decisions: defineCollection({ loader: glob({ pattern: 'D-*.md', base: './decisions' }), schema: decisionSchema }),
  questions: defineCollection({
    loader: file('./data/questions.yaml', { parser: (text) => uniqueById(YAML.parse(text), 'data/questions.yaml') }),
    schema: questionSchema,
  }),
  uc2Questions: defineCollection({ loader: file(MATRIX, { parser: matrixPart('open_questions') }), schema: uc2QuestionSchema }),
  contentTypes: defineCollection({ loader: file(MATRIX, { parser: matrixPart('components') }), schema: contentTypeSchema }),
  consolidation: defineCollection({
    loader: file(MATRIX, { parser: (text) => JSON.parse(text).consolidation.map((c: object, i: number) => ({ id: String(i + 1), ...c })) }),
    schema: consolidationSchema,
  }),
  inventory: defineCollection({
    loader: async () => parseInventory(await readFile('./sources/component-inventory.md', 'utf8')),
    schema: inventorySchema,
  }),
};
```

`src/lib/data.ts`:
```ts
import { getCollection } from 'astro:content';
import { compareIds } from './ids';
import { linkInventory } from './inventory';
import type { ContentType, SiteData } from './types';
import { assertValid } from './validate';

let cached: Promise<SiteData> | undefined;

/** All site data, validated. Cached for a build; reloaded on every call under `astro dev`. */
export function loadSiteData(): Promise<SiteData> {
  if (import.meta.env.DEV) return load();
  return (cached ??= load());
}

async function load(): Promise<SiteData> {
  const [ideas, decisions, questions, uc2Questions, contentTypes, consolidation, inventory] = await Promise.all([
    getCollection('ideas'), getCollection('decisions'), getCollection('questions'), getCollection('uc2Questions'),
    getCollection('contentTypes'), getCollection('consolidation'), getCollection('inventory'),
  ]);
  const types: ContentType[] = contentTypes
    .map(({ data: { properties, ...rest } }) => ({ ...rest, propertyCount: properties.length }))
    .sort((a, b) => compareIds(a.id, b.id));
  const data: SiteData = {
    ideas: ideas
      .map((e) => ({ slug: e.id, title: e.data.title, short: e.data.short, order: e.data.order }))
      .sort((a, b) => a.order - b.order),
    decisions: decisions.map((e) => e.data).sort((a, b) => compareIds(a.id, b.id)),
    questions: [
      ...questions.map((e) => e.data),
      ...uc2Questions.map((e) => ({ ...e.data, group: 'uc2-model' as const, idea: 'uc2-content-model' })),
    ].sort((a, b) => compareIds(a.id, b.id)),
    contentTypes: types,
    consolidation: consolidation.map((e) => e.data),
    inventory: linkInventory(inventory.map((e) => e.data), types).sort((a, b) => compareIds(a.id, b.id)),
  };
  assertValid(data);
  return data;
}
```

`data.ts` imports `compareIds` from `./ids`. Create `ids.ts` now, in its final form, and Task 4 adds its tests.

`src/lib/ids.ts`:
```ts
/** Anchor for an ID: the lower-cased ID ("DQ-9" -> "dq-9"). */
export const anchorFor = (id: string): string => id.toLowerCase();

const FAMILY_ORDER = ['Q', 'DQ', 'U', 'D', 'CT', 'C'];

function parse(id: string) {
  const m = id.match(/^(DQ|CT|Q|U|D|C)-?(\d+)([a-z]*)$/);
  if (!m) throw new Error(`not a known ID: ${id}`);
  return { family: m[1], num: Number(m[2]), suffix: m[3] };
}

/** Q before DQ before U before D before CT before C; numeric within a family; Q6 < Q6b < Q7. */
export function compareIds(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  return FAMILY_ORDER.indexOf(pa.family) - FAMILY_ORDER.indexOf(pb.family) || pa.num - pb.num || pa.suffix.localeCompare(pb.suffix);
}
```

- [ ] **Step 11: Create the idea stubs** (Task 8 overwrites them)

`src/content/ideas/uc1-solution-architecture.mdx`:
```mdx
---
title: "Use Case 1: cross-channel proof points on Contentful"
short: UC1
kicker: Solution architecture
lede: Stub, replaced by the migration.
order: 1
---
Stub.
```

`src/content/ideas/uc2-content-model.mdx`:
```mdx
---
title: "Use Case 2: partner web content on Contentful"
short: UC2
kicker: Content model
lede: Stub, replaced by the migration.
order: 2
---
Stub.
```

- [ ] **Step 12: Make the stub home page load the data**

Replace `src/pages/index.astro` with:
```astro
---
import { loadSiteData } from '../lib/data';
const data = await loadSiteData();
---
<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>Workshop</title></head>
<body><pre id="counts">{JSON.stringify({
  questions: data.questions.length, decisions: data.decisions.length,
  contentTypes: data.contentTypes.length, inventory: data.inventory.length, ideas: data.ideas.length,
})}</pre></body></html>
```

- [ ] **Step 13: Build and check the counts**

Run: `pnpm build && grep -o '<pre id="counts">[^<]*' dist/index.html && pnpm check`
Expected: `{&quot;questions&quot;:48,&quot;decisions&quot;:15,&quot;contentTypes&quot;:23,&quot;inventory&quot;:35,&quot;ideas&quot;:2}`, then `0 errors`.

- [ ] **Step 14: Prove a bad edit fails the build** (Review Focus 4)

`data/questions.yaml` was committed in Task 2, so `git checkout` restores it.
Run:
```bash
sed -i '' 's/^  status: open$/  status: answerd/' data/questions.yaml
pnpm build 2>&1 | grep -iE 'answerd|invalid|error' | head -3
git checkout data/questions.yaml
```
Expected: the build fails, and the output names the invalid `status` value. After the checkout, `git status --short data/` is empty.

- [ ] **Step 15: Commit**

```bash
git add src/lib src/content.config.ts src/content/ideas src/pages/index.astro tests
git commit -m "Load all site data through validated content collections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: ID registry and linkify

**Files:**
- Create: `src/lib/registry.ts`, `src/lib/linkify.ts` (`src/lib/ids.ts` already exists)
- Test: `tests/ids.test.ts`, `tests/registry.test.ts`, `tests/linkify.test.ts`

**Interfaces:**
- Consumes: `SiteData`, `Registry`, `RegistryEntry` (Task 3), and `anchorFor` / `compareIds` (`src/lib/ids.ts`).
- Produces:
  - `buildRegistry(data: SiteData): Registry`
  - `registryToJSON(registry: Registry): Record<string, Omit<RegistryEntry, 'id'>>`
  - `CONTENT_TYPES_IDEA = 'uc2-content-model'`
  - `createLinkifier(ids: Iterable<string>): (text: string) => Segment[]`, where `Segment = string | { id: string }`

- [ ] **Step 1: Write the failing tests**

`tests/ids.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { anchorFor, compareIds } from '../src/lib/ids';

describe('ids', () => {
  it('anchors are the lower-cased ID', () => {
    expect(anchorFor('DQ-9')).toBe('dq-9');
    expect(anchorFor('Q6b')).toBe('q6b');
  });
  it('sorts by family, then number, then suffix', () => {
    const ids = ['DQ-10', 'Q6b', 'Q10', 'Q6', 'DQ-2', 'U11', 'U3', 'Q1', 'CT01', 'C021', 'D-05'];
    expect([...ids].sort(compareIds)).toEqual(['Q1', 'Q6', 'Q6b', 'Q10', 'DQ-2', 'DQ-10', 'U3', 'U11', 'D-05', 'CT01', 'C021']);
  });
  it('rejects something that is not an ID', () => {
    expect(() => compareIds('CMS-19', 'Q1')).toThrow('not a known ID: CMS-19');
  });
});
```

`tests/registry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildRegistry, registryToJSON } from '../src/lib/registry';
import { question, siteData } from './fixtures';

describe('buildRegistry', () => {
  const registry = buildRegistry(siteData({
    questions: [question({ id: 'Q1', status: 'answered', answer: 'Template in Contentful' }), question({ id: 'DQ-9' })],
  }));

  it('has one entry per ID across all families', () => {
    expect([...registry.keys()].sort()).toEqual(['C019', 'CT01', 'D-05', 'DQ-9', 'Q1']);
  });
  it('points each family at its definition page', () => {
    expect(registry.get('DQ-9')?.href).toBe('/registers/questions/#dq-9');
    expect(registry.get('D-05')?.href).toBe('/registers/decisions/#d-05');
    expect(registry.get('CT01')?.href).toBe('/ideas/uc2-content-model/#ct01');
    expect(registry.get('C019')?.href).toBe('/registers/inventory/#c019');
  });
  it('carries question status and EG confirmation', () => {
    expect(registry.get('Q1')).toMatchObject({ kind: 'question', status: 'answered', confirmed: false });
  });
  it('labels a content type with its name and summary', () => {
    expect(registry.get('CT01')?.label).toBe('section — Container');
  });
});

describe('registryToJSON', () => {
  it('keys entries by ID without repeating the ID', () => {
    const json = registryToJSON(buildRegistry(siteData()));
    expect(json['D-05']).toEqual({ kind: 'decision', label: 'Tone belongs to the partner', href: '/registers/decisions/#d-05' });
  });
});
```

`tests/linkify.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createLinkifier } from '../src/lib/linkify';

const linkify = createLinkifier(['Q1', 'Q6', 'Q6b', 'Q26', 'DQ-1', 'DQ-10', 'DQ-9', 'CT18', 'CT21', 'C021', 'D-05']);

describe('createLinkifier', () => {
  it('splits text around known IDs', () => {
    expect(linkify('Support is DQ-9 and Q6b.')).toEqual(['Support is ', { id: 'DQ-9' }, ' and ', { id: 'Q6b' }, '.']);
  });
  it('prefers the longer ID', () => {
    expect(linkify('DQ-10')).toEqual([{ id: 'DQ-10' }]);
    expect(linkify('Q6b')).toEqual([{ id: 'Q6b' }]);
  });
  it('does not match inside longer tokens', () => {
    expect(linkify('DQ-11 and Q12 and XQ1 and Q1a')).toEqual(['DQ-11 and Q12 and XQ1 and Q1a']);
  });
  it('links IDs next to punctuation (Review Focus 1)', () => {
    expect(linkify('CT18+CT21, (DQ-9), C021, Q1–Q26.')).toEqual([
      { id: 'CT18' }, '+', { id: 'CT21' }, ', (', { id: 'DQ-9' }, '), ', { id: 'C021' }, ', ', { id: 'Q1' }, '–', { id: 'Q26' }, '.',
    ]);
  });
  it('is case-sensitive', () => {
    expect(linkify('q6b and dq-9')).toEqual(['q6b and dq-9']);
  });
  it('returns the text unchanged when there are no IDs', () => {
    expect(createLinkifier([])('Q1')).toEqual(['Q1']);
    expect(linkify('')).toEqual(['']);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test tests/ids.test.ts tests/registry.test.ts tests/linkify.test.ts`
Expected: `ids` passes, because the file already exists. `registry` and `linkify` FAIL because their modules cannot be resolved.

- [ ] **Step 3: Create `src/lib/registry.ts` and `src/lib/linkify.ts`**

`src/lib/registry.ts`:
```ts
import { anchorFor } from './ids';
import type { Registry, RegistryEntry, SiteData } from './types';

/** The idea page that defines the content types (its table rows carry the CT anchors). */
export const CONTENT_TYPES_IDEA = 'uc2-content-model';

export function buildRegistry(data: SiteData): Registry {
  const registry: Registry = new Map();
  const add = (entry: RegistryEntry) => registry.set(entry.id, entry);
  for (const q of data.questions) {
    add({ id: q.id, kind: 'question', label: q.question, status: q.status, confirmed: q.confirmedByEG, href: `/registers/questions/#${anchorFor(q.id)}` });
  }
  for (const d of data.decisions) add({ id: d.id, kind: 'decision', label: d.title, href: `/registers/decisions/#${anchorFor(d.id)}` });
  for (const c of data.contentTypes) {
    add({ id: c.id, kind: 'contentType', label: `${c.name} — ${c.summary}`, href: `/ideas/${CONTENT_TYPES_IDEA}/#${anchorFor(c.id)}` });
  }
  for (const c of data.inventory) add({ id: c.id, kind: 'component', label: c.name, href: `/registers/inventory/#${anchorFor(c.id)}` });
  return registry;
}

export function registryToJSON(registry: Registry): Record<string, Omit<RegistryEntry, 'id'>> {
  return Object.fromEntries([...registry].map(([id, { id: _id, ...rest }]) => [id, rest]));
}
```

`src/lib/linkify.ts`:
```ts
export type Segment = string | { id: string };

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Only registered IDs match. Longest first, so DQ-10 wins over DQ-1; the boundaries
 * exclude letters, digits, "_" and "-", so Q12 or XQ1 never match Q1.
 */
export function createLinkifier(ids: Iterable<string>): (text: string) => Segment[] {
  const alternatives = [...ids].sort((a, b) => b.length - a.length).map(escapeRegExp);
  if (alternatives.length === 0) return (text) => [text];
  const pattern = new RegExp(`(?<![\\w-])(${alternatives.join('|')})(?![\\w-])`, 'g');
  return (text) => {
    const out: Segment[] = [];
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > last) out.push(text.slice(last, index));
      out.push({ id: match[1] });
      last = index + match[1].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out.length > 0 ? out : [text];
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS for all files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/registry.ts src/lib/linkify.ts tests/ids.test.ts tests/registry.test.ts tests/linkify.test.ts
git commit -m "Add the ID registry and linkify

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: HTML enhancement pass (ID links and page index)

**Files:**
- Create: `src/lib/enhance.ts`, `src/middleware.ts`
- Modify: `src/pages/index.astro` (temporary check)
- Test: `tests/enhance.test.ts`

**Interfaces:**
- Consumes: `createLinkifier` (Task 4), `buildRegistry` (Task 4), `loadSiteData` (Task 3), `Registry`.
- Produces: `enhanceHtml(html: string, registry: Registry): string`, plus the markup contract every page relies on:
  - Links: `<a class="idref" href="…" data-id="ID">ID</a>`.
  - Definition sites: `id="<anchor>" data-def="<ID>"`.
  - Index: `<nav data-index>` is filled from `<section data-slide data-n data-title [data-nav] id>`.

- [ ] **Step 1: Write the failing tests** in `tests/enhance.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { enhanceHtml } from '../src/lib/enhance';
import type { Registry } from '../src/lib/types';

const registry: Registry = new Map([
  ['DQ-9', { id: 'DQ-9', kind: 'question', label: 'Who operates it?', status: 'open', href: '/registers/questions/#dq-9' }],
  ['Q6b', { id: 'Q6b', kind: 'question', label: 'Tone?', status: 'open', href: '/registers/questions/#q6b' }],
]);
const page = (body: string) => `<!doctype html><html><head><title>DQ-9</title></head><body>${body}</body></html>`;
const count = (html: string) => (html.match(/class="idref"/g) ?? []).length;

describe('enhanceHtml', () => {
  it('links known IDs in text', () => {
    expect(enhanceHtml(page('<p>See DQ-9.</p>'), registry))
      .toContain('<p>See <a class="idref" href="/registers/questions/#dq-9" data-id="DQ-9">DQ-9</a>.</p>');
  });
  it('leaves links, code, pre, svg, script and the title alone', () => {
    const out = enhanceHtml(page('<a href="#x">DQ-9</a><code>DQ-9</code><pre>DQ-9</pre><svg><text>DQ-9</text></svg><script>const a = "DQ-9";</script>'), registry);
    expect(count(out)).toBe(0);
    expect(out).toContain('<title>DQ-9</title>');
  });
  it('does not link an ID inside its own definition, but links others there', () => {
    const out = enhanceHtml(page('<article id="dq-9" data-def="DQ-9"><p>DQ-9 depends on Q6b</p></article>'), registry);
    expect(out).toContain('<p>DQ-9 depends on <a class="idref" href="/registers/questions/#q6b" data-id="Q6b">Q6b</a></p>');
  });
  it('builds the page index from slide sections, preferring the short nav label', () => {
    const out = enhanceHtml(page(
      '<nav class="index" data-index></nav><main>'
      + '<section id="ref" data-slide data-n="03" data-title="The content reference"><p>x</p></section>'
      + '<section id="open" data-slide data-n="14" data-title="Open questions raised by this design" data-nav="Open questions"><p>y</p></section>'
      + '</main>'), registry);
    expect(out).toContain('<li><a href="#ref"><span class="n">03</span>The content reference</a></li>');
    expect(out).toContain('<li><a href="#open"><span class="n">14</span>Open questions</a></li>');
  });
  it('preserves pre whitespace exactly (Review Focus 3)', () => {
    const pre = '<pre>cr:1:<span class="k">7Kx</span>@14\n\n     │         │\n     └── contract version\n{\n  "params": { "views": 47 }\n}</pre>';
    expect(enhanceHtml(page(pre), registry)).toContain(pre);
  });
  it('keeps the doctype', () => {
    expect(enhanceHtml(page('<p>x</p>'), registry).startsWith('<!doctype html>')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test tests/enhance.test.ts`
Expected: FAIL, because `../src/lib/enhance` cannot be resolved.

- [ ] **Step 3: Create `src/lib/enhance.ts`**

```ts
import type { Element, ElementContent, Root, RootContent } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import { createLinkifier } from './linkify';
import type { Registry } from './types';

/** Subtrees whose text is never linked. */
const NO_LINK = new Set(['a', 'code', 'pre', 'script', 'style', 'svg', 'head', 'title', 'textarea', 'button']);

/** Post-render pass shared by every page: links known IDs and fills the page index. */
export function enhanceHtml(html: string, registry: Registry): string {
  const tree = fromHtml(html);
  linkIds(tree, registry);
  buildIndex(tree);
  return toHtml(tree);
}

function linkIds(tree: Root, registry: Registry): void {
  const linkify = createLinkifier(registry.keys());
  const walk = (parent: Root | Element, suppressed: ReadonlySet<string>): void => {
    const next: (RootContent | ElementContent)[] = [];
    for (const child of parent.children) {
      if (child.type === 'text') {
        for (const segment of linkify(child.value)) {
          if (typeof segment === 'string') next.push({ type: 'text', value: segment });
          else if (suppressed.has(segment.id)) next.push({ type: 'text', value: segment.id });
          else next.push(idLink(segment.id, registry.get(segment.id)!.href));
        }
        continue;
      }
      if (child.type === 'element' && !NO_LINK.has(child.tagName)) {
        const defines = child.properties?.dataDef;
        walk(child, typeof defines === 'string' ? new Set([...suppressed, defines]) : suppressed);
      }
      next.push(child);
    }
    parent.children = next as typeof parent.children;
  };
  walk(tree, new Set());
}

function idLink(id: string, href: string): Element {
  return { type: 'element', tagName: 'a', properties: { className: ['idref'], href, dataId: id }, children: [{ type: 'text', value: id }] };
}

function buildIndex(tree: Root): void {
  const [nav] = findAll(tree, (e) => e.tagName === 'nav' && e.properties?.dataIndex !== undefined);
  if (!nav) return;
  const items = findAll(tree, (e) => e.tagName === 'section' && e.properties?.dataSlide !== undefined && typeof e.properties.id === 'string')
    .map((section): Element => {
      const { id, dataN, dataTitle, dataNav } = section.properties;
      return {
        type: 'element', tagName: 'li', properties: {},
        children: [{
          type: 'element', tagName: 'a', properties: { href: `#${String(id)}` },
          children: [
            { type: 'element', tagName: 'span', properties: { className: ['n'] }, children: [{ type: 'text', value: String(dataN ?? '') }] },
            { type: 'text', value: String(dataNav ?? dataTitle ?? '') },
          ],
        }],
      };
    });
  nav.children = [{ type: 'element', tagName: 'ol', properties: {}, children: items }];
}

function findAll(node: Root | Element, match: (e: Element) => boolean, out: Element[] = []): Element[] {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (match(child)) out.push(child);
    findAll(child, match, out);
  }
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test tests/enhance.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Create `src/middleware.ts`**

```ts
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
```

- [ ] **Step 6: Check it on a real build**

Add `<p id="probe">Support is DQ-9; tone is Q6b.</p>` to the `<body>` of `src/pages/index.astro`.
Run: `pnpm build && grep -o '<p id="probe">.*</p>' dist/index.html`
Expected: both IDs appear wrapped in `a.idref`, pointing at `/registers/questions/#dq-9` and `#q6b`. Then remove the probe paragraph.

- [ ] **Step 7: Commit**

```bash
git add src/lib/enhance.ts src/middleware.ts tests/enhance.test.ts src/pages/index.astro
git commit -m "Link IDs and build page indexes in one HTML pass

Astro 7's native Markdown pipeline does not run rehype plugins, so the
pass runs as middleware over the rendered page; it covers MDX prose and
data-driven components alike.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Facts, agenda and status labels

**Files:**
- Create: `src/lib/facts.ts`, `src/lib/agenda.ts`, `src/lib/status.ts`
- Test: `tests/facts.test.ts`, `tests/agenda.test.ts`, `tests/status.test.ts`

**Interfaces:**
- Consumes: `SiteData`, `Question`, `QuestionGroup`, `Status` (Task 3), and `compareIds` (Task 3).
- Produces:
  - `FACT_KEYS`, `type FactKey`, `type Facts = Record<FactKey, number>`, `computeFacts(data): Facts`, `interpolateFacts(text, facts): string`
  - `AGENDA_GROUPS: { group: QuestionGroup; title: string }[]`, `onAgenda(q)`, `hasProposal(q)`, `buildAgenda(questions): AgendaGroup[]`, where `AgendaGroup = { group; title; toConfirm: Question[]; toDecide: Question[] }`
  - `statusLabel({ status?, confirmed? }): string | undefined`

- [ ] **Step 1: Write the failing tests**

`tests/agenda.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { AGENDA_GROUPS, buildAgenda } from '../src/lib/agenda';
import { question } from './fixtures';

describe('buildAgenda', () => {
  const qs = [
    question({ id: 'Q7', group: 'scope' }),
    question({ id: 'Q5', group: 'blocking', status: 'assumed', position: 'In the resolver' }),
    question({ id: 'Q1', group: 'blocking', status: 'answered', answer: 'Template', confirmedByEG: false }),
    question({ id: 'Q2', group: 'blocking', status: 'answered', answer: 'NBA', confirmedByEG: true }),
    question({ id: 'Q3', group: 'blocking', status: 'closed' }),
    question({ id: 'Q10', group: 'scope' }),
    question({ id: 'Q6b', group: 'blocking' }),
  ];
  const agenda = buildAgenda(qs);

  it('keeps open, assumed and unconfirmed answers; drops closed and confirmed ones', () => {
    const ids = agenda.flatMap((g) => [...g.toConfirm, ...g.toDecide]).map((q) => q.id);
    expect(ids.sort()).toEqual(['Q1', 'Q10', 'Q5', 'Q6b', 'Q7']);
  });
  it('puts items with a position or an answer under "to confirm"', () => {
    const blocking = agenda.find((g) => g.group === 'blocking')!;
    expect(blocking.toConfirm.map((q) => q.id)).toEqual(['Q1', 'Q5']);
    expect(blocking.toDecide.map((q) => q.id)).toEqual(['Q6b']);
  });
  it('follows the register group order and omits empty groups', () => {
    expect(agenda.map((g) => g.group)).toEqual(['blocking', 'scope']);
    expect(AGENDA_GROUPS.map((g) => g.group)).toEqual(['blocking', 'scope', 'inputs', 'commercial', 'uc1-design', 'uc2-model']);
  });
  it('sorts by ID inside a group', () => {
    expect(agenda.find((g) => g.group === 'scope')!.toDecide.map((q) => q.id)).toEqual(['Q7', 'Q10']);
  });
});
```

`tests/facts.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computeFacts, interpolateFacts } from '../src/lib/facts';
import { question, siteData } from './fixtures';

describe('computeFacts', () => {
  const facts = computeFacts(siteData({
    questions: [
      question({ id: 'Q1', status: 'answered', answer: 'x' }), question({ id: 'Q6b' }),
      question({ id: 'DQ-4', group: 'uc1-design', status: 'assumed', position: 'yes' }),
      question({ id: 'U3', group: 'uc2-model', status: 'closed' }),
    ],
  }));
  it('counts questions by family and status', () => {
    expect(facts).toMatchObject({ egQuestions: 2, designQuestions: 1, uc2Questions: 1, questionsTotal: 4, questionsOpen: 1, questionsAssumed: 1, questionsAnswered: 1, questionsClosed: 1 });
  });
  it('counts the agenda', () => {
    expect(facts).toMatchObject({ agendaToConfirm: 2, agendaToDecide: 1 });
  });
  it('counts the content model', () => {
    expect(facts).toMatchObject({ contentTypes: 1, authorableBlocks: 0, properties: 11, keptDistinct: 1, inventoryComponents: 1, decisions: 1 });
  });
});

describe('interpolateFacts', () => {
  const facts = computeFacts(siteData());
  it('replaces {{key}} tokens', () => {
    expect(interpolateFacts('The {{contentTypes}} content types', facts)).toBe('The 1 content types');
  });
  it('leaves text without tokens alone', () => {
    expect(interpolateFacts('No numbers here', facts)).toBe('No numbers here');
  });
  it('fails on an unknown key', () => {
    expect(() => interpolateFacts('{{contentTypez}}', facts)).toThrow('unknown fact "contentTypez"');
  });
});
```

`tests/status.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { statusLabel } from '../src/lib/status';

describe('statusLabel', () => {
  it('flags an answer EG has not confirmed', () => {
    expect(statusLabel({ status: 'answered', confirmed: false })).toBe('answered · awaiting EG');
  });
  it('shows other statuses as they are', () => {
    expect(statusLabel({ status: 'answered', confirmed: true })).toBe('answered');
    expect(statusLabel({ status: 'open' })).toBe('open');
  });
  it('has no label without a status', () => {
    expect(statusLabel({})).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test tests/agenda.test.ts tests/facts.test.ts tests/status.test.ts`
Expected: FAIL, because the modules cannot be resolved.

- [ ] **Step 3: Implement the three modules**

`src/lib/agenda.ts`:
```ts
import { compareIds } from './ids';
import type { Question, QuestionGroup } from './types';

export const AGENDA_GROUPS: { group: QuestionGroup; title: string }[] = [
  { group: 'blocking', title: 'Blocking' },
  { group: 'scope', title: 'Scope boundaries' },
  { group: 'inputs', title: 'Inputs and dependencies' },
  { group: 'commercial', title: 'Commercial and evaluation' },
  { group: 'uc1-design', title: 'UC1 design' },
  { group: 'uc2-model', title: 'UC2 content model' },
];

export interface AgendaGroup {
  group: QuestionGroup;
  title: string;
  toConfirm: Question[];
  toDecide: Question[];
}

/** An answer only leaves the agenda once EG has confirmed it. */
export const onAgenda = (q: Question): boolean =>
  q.status === 'open' || q.status === 'assumed' || (q.status === 'answered' && !q.confirmedByEG);

export const hasProposal = (q: Question): boolean => Boolean(q.position || q.answer);

export function buildAgenda(questions: Question[]): AgendaGroup[] {
  return AGENDA_GROUPS.map(({ group, title }) => {
    const items = questions.filter((q) => q.group === group && onAgenda(q)).sort((a, b) => compareIds(a.id, b.id));
    return { group, title, toConfirm: items.filter(hasProposal), toDecide: items.filter((q) => !hasProposal(q)) };
  }).filter((g) => g.toConfirm.length + g.toDecide.length > 0);
}
```

`src/lib/facts.ts`:
```ts
import { buildAgenda } from './agenda';
import type { Question, SiteData } from './types';

export const FACT_KEYS = [
  'egQuestions', 'designQuestions', 'uc2Questions', 'questionsTotal',
  'questionsOpen', 'questionsAssumed', 'questionsAnswered', 'questionsClosed',
  'agendaToConfirm', 'agendaToDecide', 'decisions',
  'contentTypes', 'authorableBlocks', 'properties', 'keptDistinct', 'inventoryComponents',
] as const;
export type FactKey = (typeof FACT_KEYS)[number];
export type Facts = Record<FactKey, number>;

/** Layers an author places on a page; Structural, Chrome and Utility are not blocks. */
const BLOCK_LAYERS = new Set(['Content', 'Collection', 'Integration']);

export function computeFacts(data: SiteData): Facts {
  const qs = data.questions;
  const count = (keep: (q: Question) => boolean) => qs.filter(keep).length;
  const agenda = buildAgenda(qs);
  return {
    egQuestions: count((q) => /^Q/.test(q.id)),
    designQuestions: count((q) => q.id.startsWith('DQ-')),
    uc2Questions: count((q) => q.id.startsWith('U')),
    questionsTotal: qs.length,
    questionsOpen: count((q) => q.status === 'open'),
    questionsAssumed: count((q) => q.status === 'assumed'),
    questionsAnswered: count((q) => q.status === 'answered'),
    questionsClosed: count((q) => q.status === 'closed'),
    agendaToConfirm: agenda.reduce((n, g) => n + g.toConfirm.length, 0),
    agendaToDecide: agenda.reduce((n, g) => n + g.toDecide.length, 0),
    decisions: data.decisions.length,
    contentTypes: data.contentTypes.length,
    authorableBlocks: data.contentTypes.filter((c) => BLOCK_LAYERS.has(c.layer)).length,
    properties: data.contentTypes.reduce((n, c) => n + c.propertyCount, 0),
    keptDistinct: data.consolidation.filter((c) => c.decision === 'Kept distinct').length,
    inventoryComponents: data.inventory.length,
  };
}

/** Replaces {{key}} tokens in frontmatter strings and section titles, where components can't go. */
export function interpolateFacts(text: string, facts: Facts): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in facts)) throw new Error(`unknown fact "${key}" in "${text}"`);
    return String(facts[key as FactKey]);
  });
}
```

`src/lib/status.ts`:
```ts
import type { Status } from './types';

export function statusLabel(entry: { status?: Status; confirmed?: boolean }): string | undefined {
  if (!entry.status) return undefined;
  if (entry.status === 'answered' && entry.confirmed === false) return 'answered · awaiting EG';
  return entry.status;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS for all files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/facts.ts src/lib/agenda.ts src/lib/status.ts tests/facts.test.ts tests/agenda.test.ts tests/status.test.ts
git commit -m "Compute facts and the decision agenda from the data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Styles, layouts, Section, Fact and the home page

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/prose.css`, `src/styles/site.css`, `src/layouts/Base.astro`, `src/layouts/Doc.astro`, `src/components/Section.astro`, `src/components/Fact.astro`
- Modify: `src/pages/index.astro` (final home page)

**Interfaces:**
- Consumes: `loadSiteData`, `buildRegistry`, `registryToJSON`, `computeFacts`, `interpolateFacts`.
- Produces:
  - `<Base title description? kind>` (kind: `'home' | 'idea' | 'agenda' | 'register'`)
  - `<Doc title kicker lede meta? kind>`: masthead `header.mast[data-slide]`, `nav.index[data-index]`, and `main[data-pagefind-body]`
  - `<Section n id title nav?>`, where title and nav accept `{{factKey}}`
  - `<Fact k />`
  - Registry JSON in `script#idref-data`, and top-bar hooks `[data-search-open]` and `[data-present-toggle]`

- [ ] **Step 1: Create `src/styles/tokens.css`**

This holds the tokens and page frame from the original documents, with font sizes converted to rem so presentation mode can scale them.

```css
:root{
  --paper:#f6f8fc; --card:#ffffff; --ink:#131a2c; --ink-soft:#4e5872;
  --rule:#d3d9e8; --rule-soft:#e5e9f3;
  --accent:#2148b8; --accent-soft:#e7edfc;
  --flag:#9d1c2e; --flag-soft:#fbe9ec;
  --ok:#1d6a4f; --ok-soft:#e3f2ec;
  --warm:#8a5a12; --warm-soft:#fbf0dc;
  --sans:"IBM Plex Sans",ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --paper:#0e1220; --card:#161c2e; --ink:#e7ebf5; --ink-soft:#9aa5bf;
    --rule:#2b3349; --rule-soft:#222a3d; --accent:#7fa0ff; --accent-soft:#1c2542;
    --flag:#ff8d9e; --flag-soft:#33202a; --ok:#6fd1a8; --ok-soft:#162c26;
    --warm:#e0b061; --warm-soft:#2c2416;
  }
}
:root[data-theme="dark"]{
  --paper:#0e1220; --card:#161c2e; --ink:#e7ebf5; --ink-soft:#9aa5bf;
  --rule:#2b3349; --rule-soft:#222a3d; --accent:#7fa0ff; --accent-soft:#1c2542;
  --flag:#ff8d9e; --flag-soft:#33202a; --ok:#6fd1a8; --ok-soft:#162c26;
  --warm:#e0b061; --warm-soft:#2c2416;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:1rem;line-height:1.55}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px 96px}

header.mast{border-bottom:2px solid var(--ink);padding:40px 0 22px;margin-bottom:34px}
.kicker{font-size:.8125rem;color:var(--ink-soft);margin:0 0 10px}
h1{font-size:clamp(1.6875rem,4.2vw,2.625rem);line-height:1.12;margin:0 0 14px;font-weight:700;letter-spacing:-.02em;max-width:24ch}
.lede{max-width:72ch;font-size:1.0625rem;color:var(--ink-soft);margin:0}
.meta{margin-top:20px;font-family:var(--mono);font-size:.78125rem;color:var(--ink-soft);display:flex;flex-wrap:wrap;gap:6px 22px}

.cols{display:grid;grid-template-columns:196px minmax(0,1fr);gap:48px;align-items:start}
@media (max-width:940px){.cols{grid-template-columns:1fr;gap:0}}
nav.index{position:sticky;top:64px;font-size:.875rem}
@media (max-width:940px){nav.index{position:static;margin-bottom:40px;border:1px solid var(--rule);border-radius:4px;padding:16px 18px;background:var(--card)}}
nav.index ol{list-style:none;margin:0;padding:0}
nav.index li{margin:0 0 9px}
nav.index a{color:var(--ink-soft);text-decoration:none;border-bottom:1px solid transparent}
nav.index a:hover,nav.index a:focus-visible{color:var(--accent);border-bottom-color:var(--accent)}
nav.index .n{font-family:var(--mono);font-size:.71875rem;color:var(--accent);margin-right:7px}
```

- [ ] **Step 2: Create `src/styles/prose.css`**

This is the documents' content styles, merged from doc 02 and doc 03 (doc 02's values where they differ by a pixel), in rem.

```css
section{margin:0 0 64px}
[id]{scroll-margin-top:72px}
h2{font-size:1.5rem;line-height:1.2;margin:0 0 6px;font-weight:700;letter-spacing:-.01em}
h2 .h-n{font-family:var(--mono);font-size:.875rem;color:var(--accent);display:block;margin-bottom:6px;font-weight:500}
.sec-note{max-width:74ch;color:var(--ink-soft);margin:0 0 24px;font-size:.96875rem}
h3{font-size:1.03125rem;margin:34px 0 14px;font-weight:600;padding-bottom:7px;border-bottom:1px solid var(--rule)}
h4{font-size:.9375rem;margin:24px 0 10px;font-weight:600}
p{max-width:76ch}

.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--rule);border-radius:4px;background:var(--card);margin:0 0 18px}
table{border-collapse:collapse;width:100%;min-width:660px;font-size:.90625rem}
th,td{text-align:left;padding:12px 15px;vertical-align:top;border-bottom:1px solid var(--rule-soft)}
thead th{background:var(--accent-soft);color:var(--ink);font-weight:600;font-size:.8125rem;border-bottom:1px solid var(--rule)}
tbody tr:last-child td{border-bottom:0}
td.n,td.ref{font-family:var(--mono);font-size:.78125rem;white-space:nowrap}
td.n{color:var(--accent);font-weight:600}
td.ref{color:var(--ink-soft)}
code{font-family:var(--mono);font-size:.8125rem;background:var(--accent-soft);padding:1px 5px;border-radius:3px}
pre{font-family:var(--mono);font-size:.8125rem;line-height:1.5;background:var(--card);border:1px solid var(--rule);border-left:3px solid var(--accent);border-radius:3px;padding:14px 16px;overflow-x:auto;margin:0 0 18px}
pre .c{color:var(--ink-soft)}
pre .k{color:var(--accent)}

.fig{margin:0 0 10px;border:1px solid var(--rule);border-radius:4px;background:var(--card);padding:18px 16px;overflow-x:auto}
.fig svg{display:block;width:100%;height:auto;min-width:640px}
.dg text{font-family:var(--sans)}
.cap{font-size:.84375rem;color:var(--ink-soft);margin:0 0 26px;max-width:74ch}

.decide{border:1px solid var(--rule);border-left:3px solid var(--ok);background:var(--card);border-radius:3px;padding:16px 18px;margin:0 0 12px}
.decide.risk{border-left-color:var(--flag)}
.decide h4{margin:0 0 7px;font-size:.96875rem}
.decide p{margin:0 0 7px;font-size:.9375rem;color:var(--ink-soft)}
.decide p:last-child{margin:0}
.decide strong{color:var(--ink)}
.stamp{font-family:var(--mono);font-size:.6875rem;padding:2px 7px;border-radius:3px;background:var(--ok-soft);color:var(--ok);margin-right:8px;vertical-align:2px}
.decide.risk .stamp{background:var(--flag-soft);color:var(--flag)}

ul.tight{margin:0 0 16px;padding-left:19px;font-size:.9375rem;color:var(--ink-soft);max-width:78ch}
ul.tight li{margin:0 0 5px}
ul.tight li::marker{color:var(--accent)}
ul.tight strong{color:var(--ink)}

.legend{display:flex;flex-wrap:wrap;gap:10px 22px;font-size:.8125rem;color:var(--ink-soft);margin:0 0 24px}
.sw{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:7px;vertical-align:0}
.sw1{background:var(--accent)} .sw2{background:var(--warm)} .sw3{background:var(--ok)} .sw4{background:var(--flag)}

.pill{font-family:var(--mono);font-size:.65625rem;padding:2px 7px;border-radius:3px;white-space:nowrap}
.p-merge{background:var(--ok-soft);color:var(--ok)}
.p-abs{background:var(--accent-soft);color:var(--accent)}
.p-recl{background:var(--warm-soft);color:var(--warm)}
.p-keep{background:var(--rule-soft);color:var(--ink-soft)}

.stat{display:flex;flex-wrap:wrap;gap:0;border:1px solid var(--rule);border-radius:4px;background:var(--card);margin:0 0 24px;overflow:hidden}
.stat div{flex:1 1 130px;padding:14px 16px;border-right:1px solid var(--rule-soft)}
.stat div:last-child{border-right:0}
.stat b{display:block;font-size:1.375rem;font-weight:700;letter-spacing:-.01em}
.stat span{font-size:.78125rem;color:var(--ink-soft)}

main footer{border-top:1px solid var(--rule);padding-top:20px;color:var(--ink-soft);font-size:.875rem;max-width:74ch}
a{color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
```

- [ ] **Step 3: Create `src/styles/site.css`** (new chrome: top bar, home cards, ID links, tooltip, question items, status chips, search)

```css
.topbar{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px;padding:10px 20px;background:var(--paper);border-bottom:1px solid var(--rule);font-size:.875rem}
@media (max-width:940px){.topbar{position:static}}
.topbar .brand{font-weight:600;color:var(--ink);text-decoration:none;margin-right:auto}
.topbar nav{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px}
.topbar nav a{color:var(--ink-soft);text-decoration:none}
.topbar nav a:hover,.topbar nav a[aria-current="page"]{color:var(--accent)}
.topbar button{font:inherit;color:var(--ink-soft);background:var(--card);border:1px solid var(--rule);border-radius:3px;padding:3px 9px;cursor:pointer}
.topbar button:hover{color:var(--accent);border-color:var(--accent)}
kbd{font-family:var(--mono);font-size:.6875rem;color:var(--ink-soft);border:1px solid var(--rule);border-radius:2px;padding:0 4px;margin-left:4px}

.home-h{margin:40px 0 14px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin:0 0 24px}
.card{display:block;border:1px solid var(--rule);border-radius:4px;background:var(--card);padding:18px 20px;color:inherit;text-decoration:none}
.card:hover,.card:focus-visible{border-color:var(--accent)}
.card .kicker{margin-bottom:6px}
.card h3{font-size:1.1875rem;margin:0 0 8px;padding:0;border:0}
.card p{margin:0;color:var(--ink-soft);font-size:.9375rem;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.card.agenda{border-left:3px solid var(--ok)}
.registers{padding-left:19px}
.registers li{margin:0 0 6px}

a.idref{color:inherit;text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:1px;text-underline-offset:2px}
a.idref:hover,a.idref:focus-visible{color:var(--accent)}
#idref-tip{position:absolute;z-index:40;background:var(--card);color:var(--ink);border:1px solid var(--rule);border-left:3px solid var(--accent);border-radius:3px;padding:10px 12px;font-size:.84375rem;line-height:1.45;box-shadow:0 6px 24px rgb(0 0 0 / .12)}
#idref-tip .tip-head{display:flex;gap:8px;align-items:center;margin-bottom:4px;font-family:var(--mono);font-size:.75rem}
#idref-tip .tip-body{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}

.st{font-family:var(--mono);font-size:.6875rem;padding:1px 6px;border-radius:3px;background:var(--rule-soft);color:var(--ink-soft);white-space:nowrap}
.st-open{background:var(--flag-soft);color:var(--flag)}
.st-assumed{background:var(--warm-soft);color:var(--warm)}
.st-answered{background:var(--ok-soft);color:var(--ok)}

.q-item{border:1px solid var(--rule);border-left:3px solid var(--accent);background:var(--card);border-radius:3px;padding:14px 18px;margin:0 0 12px}
.q-item.to-confirm{border-left-color:var(--ok)}
.q-item.to-decide{border-left-color:var(--flag)}
.q-item header{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px}
.q-item .qid{font-family:var(--mono);font-size:.8125rem;font-weight:600;color:var(--accent)}
.q-item .qt{margin:0;font-weight:600;flex:1 1 30ch}
.q-item p{margin:8px 0 0;font-size:.9375rem;color:var(--ink-soft)}
.q-item .proposal{color:var(--ink)}
.q-item .q-meta{display:flex;flex-wrap:wrap;gap:4px 18px;font-size:.84375rem}
.q-item .label{font-family:var(--mono);font-size:.6875rem;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft);margin-right:6px}

dialog.search{width:min(640px,calc(100vw - 32px));max-height:min(70vh,640px);padding:0;border:1px solid var(--rule);border-radius:4px;background:var(--card);color:var(--ink)}
dialog.search::backdrop{background:rgb(0 0 0 / .35)}
.search-form{display:flex;gap:8px;padding:12px;border-bottom:1px solid var(--rule)}
.search-form input{flex:1;min-width:0;font:inherit;padding:8px 10px;border:1px solid var(--rule);border-radius:3px;background:var(--paper);color:var(--ink)}
.search-form button{font:inherit;font-size:.8125rem;background:none;border:1px solid var(--rule);border-radius:3px;color:var(--ink-soft);cursor:pointer}
.search-note{margin:12px;font-size:.875rem;color:var(--ink-soft)}
.search-results{list-style:none;margin:0;padding:6px 0;overflow-y:auto}
.search-results a{display:block;padding:10px 14px;color:inherit;text-decoration:none}
.search-results a:hover,.search-results a:focus-visible{background:var(--accent-soft)}
.search-results .r-kind{font-family:var(--mono);font-size:.6875rem;color:var(--accent);text-transform:uppercase;margin-right:8px}
.search-results .r-title{font-weight:600}
.search-results .r-excerpt{display:block;font-size:.84375rem;color:var(--ink-soft);margin-top:2px}
.search-results mark{background:var(--warm-soft);color:inherit}
```

- [ ] **Step 4: Create `src/layouts/Base.astro`**

```astro
---
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '../styles/tokens.css';
import '../styles/prose.css';
import '../styles/site.css';
import { loadSiteData } from '../lib/data';
import { buildRegistry, registryToJSON } from '../lib/registry';

interface Props {
  title: string;
  description?: string;
  kind: 'home' | 'idea' | 'agenda' | 'register';
}
const { title, description, kind } = Astro.props;
const data = await loadSiteData();
// "<" is escaped so a label can never close the script element.
const registryJson = JSON.stringify(registryToJSON(buildRegistry(data))).replace(/</g, '\\u003c');
const path = Astro.url.pathname;
const current = (href: string) => (path === href ? 'page' : undefined);
const links = [
  ...data.ideas.map((i) => ({ href: `/ideas/${i.slug}/`, label: i.short })),
  { href: '/decide/', label: 'Decide' },
  { href: '/registers/questions/', label: 'Questions' },
  { href: '/registers/decisions/', label: 'Decisions' },
  { href: '/registers/inventory/', label: 'Inventory' },
];
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
  </head>
  <body data-kind={kind}>
    <header class="topbar">
      <a class="brand" href="/">EG · CF · GL workshop</a>
      <nav aria-label="Site">
        {links.map((l) => <a href={l.href} aria-current={current(l.href)}>{l.label}</a>)}
        <button type="button" data-search-open>Search<kbd>/</kbd></button>
        <button type="button" data-present-toggle hidden>Present<kbd>P</kbd></button>
      </nav>
    </header>
    <slot />
    <script type="application/json" id="idref-data" is:inline set:html={registryJson} />
  </body>
</html>
```

- [ ] **Step 5: Create `src/layouts/Doc.astro`, `src/components/Section.astro` and `src/components/Fact.astro`**

`src/layouts/Doc.astro`:
```astro
---
import Base from './Base.astro';
import { loadSiteData } from '../lib/data';
import { computeFacts, interpolateFacts } from '../lib/facts';

interface Props {
  title: string;
  kicker: string;
  lede: string;
  meta?: string[];
  kind: 'idea' | 'agenda' | 'register';
}
const { title, kicker, kind } = Astro.props;
const facts = computeFacts(await loadSiteData());
const lede = interpolateFacts(Astro.props.lede, facts);
const meta = (Astro.props.meta ?? []).map((m) => interpolateFacts(m, facts));
---
<Base title={title} description={lede} kind={kind}>
  <div class="wrap">
    <header class="mast" data-slide>
      <p class="kicker">{kicker}</p>
      <h1>{title}</h1>
      <p class="lede">{lede}</p>
      {meta.length > 0 && <p class="meta">{meta.map((m) => <span>{m}</span>)}</p>}
    </header>
    <div class="cols">
      <nav class="index" aria-label="Contents" data-index></nav>
      <main data-pagefind-body data-pagefind-meta={`kind:${kind}`}>
        <slot />
      </main>
    </div>
  </div>
</Base>
```

`src/components/Section.astro`:
```astro
---
import { loadSiteData } from '../lib/data';
import { computeFacts, interpolateFacts } from '../lib/facts';

interface Props {
  n: string;
  id: string;
  title: string;
  /** Shorter label for the page index, when the heading is long. */
  nav?: string;
}
const { n, id } = Astro.props;
const needsFacts = Astro.props.title.includes('{{') || Astro.props.nav?.includes('{{');
const facts = needsFacts ? computeFacts(await loadSiteData()) : undefined;
const title = facts ? interpolateFacts(Astro.props.title, facts) : Astro.props.title;
const nav = facts && Astro.props.nav ? interpolateFacts(Astro.props.nav, facts) : Astro.props.nav;
---
<section id={id} data-slide data-n={n} data-title={title} data-nav={nav}>
  <h2><span class="h-n">{n}</span>{title}</h2>
  <slot />
</section>
```

`src/components/Fact.astro`:
```astro
---
import { loadSiteData } from '../lib/data';
import { computeFacts, FACT_KEYS, type FactKey } from '../lib/facts';

interface Props { k: FactKey }
const { k } = Astro.props;
if (!FACT_KEYS.includes(k)) throw new Error(`<Fact>: unknown key "${k}"`);
const value = computeFacts(await loadSiteData())[k];
---
{value}
```

- [ ] **Step 6: Replace `src/pages/index.astro` with the home page**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import { loadSiteData } from '../lib/data';
import { computeFacts, interpolateFacts } from '../lib/facts';

const facts = computeFacts(await loadSiteData());
const ideas = (await getCollection('ideas')).sort((a, b) => a.data.order - b.data.order);
---
<Base title="EG CMS pilot — workshop" kind="home">
  <div class="wrap">
    <header class="mast">
      <p class="kicker">Expedia Group · Contentful · Globant</p>
      <h1>CMS pilot workshop</h1>
      <p class="lede">The design proposals for the Contentful pilot, and the questions the pilot needs answered. Press <kbd>P</kbd> on any page to present it, and <kbd>/</kbd> to search.</p>
    </header>
    <main>
      <h2 class="home-h">Ideas</h2>
      <div class="cards">
        {ideas.map((idea) => (
          <a class="card" href={`/ideas/${idea.id}/`}>
            <p class="kicker">{idea.data.kicker}</p>
            <h3>{idea.data.title}</h3>
            <p>{interpolateFacts(idea.data.lede, facts)}</p>
          </a>
        ))}
      </div>
      <h2 class="home-h">Decide</h2>
      <div class="cards">
        <a class="card agenda" href="/decide/">
          <p class="kicker">Decision agenda</p>
          <h3>{facts.agendaToConfirm} to confirm · {facts.agendaToDecide} to decide</h3>
          <p>Open and assumed questions grouped by topic, each with the position proposed for it.</p>
        </a>
      </div>
      <h2 class="home-h">Registers</h2>
      <ul class="registers">
        <li><a href="/registers/questions/">Questions</a> — {facts.questionsTotal}</li>
        <li><a href="/registers/decisions/">Decisions</a> — {facts.decisions}</li>
        <li><a href="/registers/inventory/">Component inventory</a> — {facts.inventoryComponents}</li>
      </ul>
    </main>
  </div>
</Base>
```

- [ ] **Step 7: Build and look at it**

Run: `pnpm build && pnpm check`
Expected: `0 errors`, and the build prints `1 page(s) built` (the idea route arrives in Task 8).
Run: `pnpm preview` and open `http://localhost:4321/` with the Playwright MCP (`browser_navigate`, then `browser_take_screenshot`). Check it at 1440 px and at 390 px (`browser_resize`).
Expected: IBM Plex fonts, the top bar with UC1, UC2 and the register links, and three card groups. At 390 px nothing scrolls sideways. The register links 404 until Task 9, which is expected.

- [ ] **Step 8: Commit**

```bash
git add src/styles src/layouts src/components/Section.astro src/components/Fact.astro src/pages/index.astro
git commit -m "Add the design tokens, layouts and home page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Migrate UC1 and UC2 into MDX, with the fidelity check

**Files:**
- Create (gitignored): `.migrate/convert.mjs`
- Create: `src/content/fragments/uc1-1.html … uc1-5.html`, `src/components/ContentTypeTable.astro`, `src/pages/ideas/[slug].astro`, `scripts/verify-fidelity.mjs`, `scripts/fidelity-allowlist.json`
- Overwrite: `src/content/ideas/uc1-solution-architecture.mdx`, `src/content/ideas/uc2-content-model.mdx`
- Modify: `package.json` (add a `verify:fidelity` script)

**Interfaces:**
- Consumes: `Section`, `Fact`, `Doc`, `loadSiteData`, `compareIds`, `anchorFor`.
- Produces:
  - Idea pages at `/ideas/uc1-solution-architecture/` and `/ideas/uc2-content-model/`.
  - CT definition sites `tr#ct01[data-def=CT01]`.
  - `pnpm verify:fidelity`.

- [ ] **Step 1: Write the fidelity check first** (`scripts/verify-fidelity.mjs`) and an empty allowlist

`scripts/fidelity-allowlist.json`:
```json
[]
```

`scripts/verify-fidelity.mjs`:
```js
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
```

Add to `package.json` scripts: `"verify:fidelity": "node scripts/verify-fidelity.mjs"`.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm build; pnpm verify:fidelity`
Expected: FAIL. The idea route doesn't exist yet, so the script throws `ENOENT … dist/ideas/uc1-solution-architecture/index.html`.

- [ ] **Step 3: Create `src/components/ContentTypeTable.astro` and `src/pages/ideas/[slug].astro`**

`src/components/ContentTypeTable.astro` renders the same markup as doc 03's table. Each row is a CT definition site.
```astro
---
import { loadSiteData } from '../lib/data';
import { anchorFor } from '../lib/ids';
const { contentTypes } = await loadSiteData();
---
<div class="scroll">
  <table>
    <thead><tr><th style="width:7%">ID</th><th style="width:18%">Type</th><th style="width:12%">Layer</th><th style="width:7%">Props</th><th style="width:8%">Reuse</th><th style="width:8%">Cplx</th><th>Purpose</th></tr></thead>
    <tbody>
      {contentTypes.map((ct) => (
        <tr id={anchorFor(ct.id)} data-def={ct.id}><td class="n">{ct.id}</td><td><code>{ct.name}</code></td><td>{ct.layer}</td><td class="ref">{ct.propertyCount}</td><td class="ref">{ct.reuse}</td><td class="ref">{ct.complexity}</td><td>{ct.summary}</td></tr>
      ))}
    </tbody>
  </table>
</div>
```

`src/pages/ideas/[slug].astro`:
```astro
---
import { getCollection, render } from 'astro:content';
import Doc from '../../layouts/Doc.astro';

export async function getStaticPaths() {
  const ideas = await getCollection('ideas');
  return ideas.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}
const { entry } = Astro.props;
const { Content } = await render(entry);
---
<Doc title={entry.data.title} kicker={entry.data.kicker} lede={entry.data.lede} meta={entry.data.meta} kind="idea">
  <Content />
</Doc>
```

- [ ] **Step 4: Write `.migrate/convert.mjs`**

```js
// One-off: converts doc 02 and doc 03 into MDX ideas. <pre> and <svg> become raw fragments
// (MDX would collapse pre whitespace and read braces as expressions); every other brace is
// escaped; HTML comments are dropped (MDX rejects them).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { fromHtml } from 'hast-util-from-html';
import { select, selectAll } from 'hast-util-select';
import YAML from 'yaml';

const BASE = '6c8dd77';
const git = (p) => execSync(`git show ${BASE}:${p}`, { encoding: 'utf8', maxBuffer: 1 << 26 });
const text = (n) => { let s = ''; (function walk(x) { if (x.type === 'text') s += x.value; (x.children ?? []).forEach(walk); })(n); return s.replace(/\s+/g, ' ').trim(); };
const once = (source, from, to, label) => {
  const parts = source.split(from);
  if (parts.length !== 2) throw new Error(`${label}: expected exactly one match for ${JSON.stringify(from)}, found ${parts.length - 1}`);
  return parts.join(to);
};

const JOBS = [
  {
    src: 'docs/02-uc1-solution-architecture.html', slug: 'uc1-solution-architecture', short: 'UC1', order: 1, prefix: 'uc1',
    renameSections: { rejected: 'alternatives' }, titles: {}, lede: [], body: [],
  },
  {
    src: 'docs/03-uc2-content-model.html', slug: 'uc2-content-model', short: 'UC2', order: 2, prefix: 'uc2',
    renameSections: {},
    titles: { types: 'The {{contentTypes}} content types' },
    lede: [
      ['The 35 approved', 'The {{inventoryComponents}} approved'],
      ['become 23 Contentful', 'become {{contentTypes}} Contentful'],
      ['of which 17 are', 'of which {{authorableBlocks}} are'],
      ['all 136 property', 'all {{properties}} property'],
    ],
    body: [
      ['<div><b>35</b><span>inventory components</span></div>', '<div><b><Fact k="inventoryComponents" /></b><span>inventory components</span></div>'],
      ['<div><b>23</b><span>content types</span></div>', '<div><b><Fact k="contentTypes" /></b><span>content types</span></div>'],
      ['<div><b>17</b><span>authorable blocks</span></div>', '<div><b><Fact k="authorableBlocks" /></b><span>authorable blocks</span></div>'],
      ['<div><b>136</b><span>properties specified</span></div>', '<div><b><Fact k="properties" /></b><span>properties specified</span></div>'],
      ['<div><b>4</b><span>kept distinct</span></div>', '<div><b><Fact k="keptDistinct" /></b><span>kept distinct</span></div>'],
      ['so the 23 types resolve to 17 block components', 'so the <Fact k="contentTypes" /> types resolve to <Fact k="authorableBlocks" /> block components'],
      ['(35 components, C001', '(<Fact k="inventoryComponents" /> components, C001'],
    ],
    typesTable: /<div class="scroll">\s*<table>\s*<thead><tr><th[^>]*>ID<\/th><th[^>]*>Type<\/th>[\s\S]*?<\/table>\s*<\/div>/,
  },
];

fs.mkdirSync('src/content/fragments', { recursive: true });
for (const job of JOBS) {
  const html = git(job.src);
  const tree = fromHtml(html);
  const mast = select('header.mast', tree);
  const navLabels = new Map(selectAll('nav.index li a', tree).map((a) => {
    const label = a.children.filter((c) => c.type === 'text').map((c) => c.value).join('').trim();
    return [String(a.properties.href).slice(1), label];
  }));
  let lede = text(select('.lede', mast));
  for (const [from, to] of job.lede) lede = once(lede, from, to, `${job.slug} lede`);
  const front = {
    title: text(select('h1', mast)), short: job.short, kicker: text(select('.kicker', mast)),
    lede, order: job.order, meta: selectAll('.meta span', mast).map(text),
  };

  let body = html.slice(html.indexOf('<main>') + '<main>'.length, html.indexOf('</main>'));
  const fragments = [];
  body = body.replace(/<!--[\s\S]*?-->/g, '');
  if (job.typesTable) {
    const matches = body.match(new RegExp(job.typesTable.source, 'g')) ?? [];
    if (matches.length !== 1) throw new Error(`${job.slug}: expected one content-type table, found ${matches.length}`);
    body = body.replace(job.typesTable, '@@TYPES@@');
  }
  body = body
    .replace(/<(pre|svg)\b[\s\S]*?<\/\1>/g, (markup) => {
      const name = `${job.prefix}-${fragments.length + 1}`;
      fragments.push([name, markup]);
      return `@@FRAGMENT:${name}@@`;
    })
    .replace(/<br>/g, '<br />')
    .replace(/[{}]/g, (c) => `\\${c}`)
    .replace(/<section id="([^"]+)">\s*<h2><span class="h-n">(\d+)<\/span>([^<]+)<\/h2>/g, (_, id, n, rawTitle) => {
      const title = job.titles[id] ?? rawTitle.trim();
      if (/["&]/.test(title)) throw new Error(`${job.slug}: section title needs manual escaping: ${title}`);
      const nav = navLabels.get(id);
      const navAttr = nav && nav !== rawTitle.trim() ? ` nav="${nav}"` : '';
      return `<Section n="${n}" id="${job.renameSections[id] ?? id}" title="${title}"${navAttr}>`;
    })
    .replace(/<\/section>/g, '</Section>')
    .replace('@@TYPES@@', '<ContentTypeTable />')
    .replace(/@@FRAGMENT:([\w-]+)@@/g, (_, name) => `<Fragment set:html={${name.replace(/-(\d+)$/, 'Fragment$1')}} />`);
  for (const [from, to] of job.body) body = once(body, from, to, `${job.slug} body`);

  const imports = [
    `import Section from '../../components/Section.astro';`,
    `import Fact from '../../components/Fact.astro';`,
    ...(job.typesTable ? [`import ContentTypeTable from '../../components/ContentTypeTable.astro';`] : []),
    ...fragments.map(([name]) => `import ${name.replace(/-(\d+)$/, 'Fragment$1')} from '../fragments/${name}.html?raw';`),
  ];
  fs.writeFileSync(`src/content/ideas/${job.slug}.mdx`, `---\n${YAML.stringify(front, { lineWidth: 0 })}---\n${imports.join('\n')}\n\n${body.trim()}\n`);
  for (const [name, markup] of fragments) fs.writeFileSync(`src/content/fragments/${name}.html`, markup);
  console.log(`${job.slug}: ${fragments.length} fragments`);
}
```

If a `once(...)` assertion fails, the original HTML has tags inside that phrase. Open the original at that phrase (`git show 6c8dd77:docs/03-uc2-content-model.html | grep -n "<phrase>"`) and copy the exact HTML into the job's `body` pair.

- [ ] **Step 5: Run the converter and build**

Run: `node .migrate/convert.mjs && pnpm build`
Expected: `uc1-solution-architecture: 5 fragments`, `uc2-content-model: 0 fragments`, then `7 page(s) built` or fewer. The register and decide pages don't exist yet, so the count is at least 3: home plus two ideas.

- [ ] **Step 6: Run the fidelity check to verify it passes**

Run: `pnpm verify:fidelity`
Expected: a `✓` for each of the 16 UC1 blocks (masthead + 15 sections), the UC1 footer, `pre 1 exact` and `pre 2 exact`, the 7 UC2 blocks, and 27 `detail` lines, ending with `fidelity: ok`.

If a block differs only because a computed `<Fact>` disagrees with the old hand-written number, **do not edit the allowlist**. That is a data discrepancy: add it to `docs/superpowers/migration-discrepancies.md` under a new heading and leave the check failing until the owner decides in Task 14.

- [ ] **Step 7: Check the ID links and index on the built pages**

Run:
```bash
grep -o 'class="idref"' dist/ideas/uc1-solution-architecture/index.html | wc -l
grep -o '<a class="idref" href="/registers/questions/#dq-10" data-id="DQ-10">' dist/ideas/uc1-solution-architecture/index.html | head -1
grep -o 'data-def="CT[0-9]*"' dist/ideas/uc2-content-model/index.html | wc -l
grep -o '<nav class="index"[^>]*><ol>.\{0,200\}' dist/ideas/uc1-solution-architecture/index.html
```
Expected:
- The first count is above 20.
- The DQ-10 link exists and is never split into DQ-1 plus "0".
- The third command prints `23`.
- The index starts with `<li><a href="#position"><span class="n">01</span>Design positions</a></li>`, which is the short nav label from the original.

- [ ] **Step 8: Look at both pages**

Run `pnpm preview`, then take Playwright screenshots of `/ideas/uc1-solution-architecture/` (Figure 1, the content-reference `<pre>`, the §07 table) and `/ideas/uc2-content-model/` (the stat strip and the types table), at 1440 px and 390 px.
Expected: they match the originals (`git show 6c8dd77:docs/02-uc1-solution-architecture.html > /tmp/uc1.html` and open it side by side). SVGs pick up the theme colours, and nothing scrolls sideways at 390 px except inside `.scroll` and `.fig`.

- [ ] **Step 9: Commit**

```bash
git add src/content src/components/ContentTypeTable.astro src/pages/ideas scripts/verify-fidelity.mjs scripts/fidelity-allowlist.json package.json
git commit -m "Migrate UC1 and UC2 into MDX ideas

Converted mechanically from the original HTML and checked by
verify-fidelity: identical visible text per section, byte-identical
<pre> blocks. UC2 counts now come from the data.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Register pages and the anchor check

**Files:**
- Create: `src/components/StatusChip.astro`, `src/components/QuestionItem.astro`, `src/pages/registers/questions.astro`, `src/pages/registers/decisions.astro`, `src/pages/registers/inventory.astro`, `scripts/verify-anchors.mjs`
- Modify: `package.json` (add the `verify:anchors` and `verify` scripts)

**Interfaces:**
- Consumes: `Doc`, `Section`, `loadSiteData`, `AGENDA_GROUPS`, `hasProposal`, `anchorFor`, `statusLabel`.
- Produces:
  - Definition sites `article#q1[data-def=Q1]`, `article#d-05[data-def=D-05]` and `tr#c021[data-def=C021]`.
  - `<QuestionItem q defines? ideaTitles>`, which Task 10 reuses.
  - `pnpm verify:anchors` and `pnpm verify`.

- [ ] **Step 1: Write the anchor check first** (`scripts/verify-anchors.mjs`)

```js
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
```

Add to `package.json` scripts:
```json
"verify:anchors": "node scripts/verify-anchors.mjs",
"verify": "pnpm verify:anchors && pnpm verify:fidelity"
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm build && pnpm verify:anchors`
Expected: FAIL, with broken links to `/registers/questions/`, `/registers/decisions/`, `/registers/inventory/` and `/decide/`.

- [ ] **Step 3: Create `StatusChip.astro` and `QuestionItem.astro`**

`src/components/StatusChip.astro`:
```astro
---
import { statusLabel } from '../lib/status';
import type { Status } from '../lib/types';
interface Props { status: Status; confirmed?: boolean }
const { status, confirmed } = Astro.props;
---
<span class={`st st-${status}`}>{statusLabel({ status, confirmed })}</span>
```

`src/components/QuestionItem.astro`:
```astro
---
import StatusChip from './StatusChip.astro';
import { hasProposal } from '../lib/agenda';
import { anchorFor } from '../lib/ids';
import type { Question } from '../lib/types';

interface Props {
  q: Question;
  /** True only on the register, which is where the ID is defined. */
  defines?: boolean;
  ideaTitles: Record<string, string>;
}
const { q, defines = false, ideaTitles } = Astro.props;
const proposal = q.answer ?? q.position;
const discussedIn = q.idea ? { href: `/ideas/${q.idea}/${q.section ? `#${q.section}` : ''}`, label: ideaTitles[q.idea] ?? q.idea } : undefined;
---
<article
  class={`q-item ${hasProposal(q) ? 'to-confirm' : 'to-decide'}`}
  id={defines ? anchorFor(q.id) : undefined}
  data-def={defines ? q.id : undefined}
>
  <header>
    <span class="qid">{q.id}</span>
    <p class="qt">{q.question}</p>
    <StatusChip status={q.status} confirmed={q.confirmedByEG} />
  </header>
  {q.detail && <p>{q.detail}</p>}
  {q.why && <p>{q.why}</p>}
  {proposal && <p class="proposal"><span class="label">{q.answer ? 'Answer' : 'Proposed position'}</span>{proposal}</p>}
  {q.blocks && <p><span class="label">Blocks</span>{q.blocks}</p>}
  {(q.owner || discussedIn) && (
    <p class="q-meta">
      {q.owner && <span><span class="label">Owner</span>{q.owner}</span>}
      {discussedIn && <span><span class="label">Discussed in</span><a href={discussedIn.href}>{discussedIn.label}</a></span>}
    </p>
  )}
</article>
```

- [ ] **Step 4: Create the three register pages**

`src/pages/registers/questions.astro`:
```astro
---
import Doc from '../../layouts/Doc.astro';
import Section from '../../components/Section.astro';
import QuestionItem from '../../components/QuestionItem.astro';
import { AGENDA_GROUPS } from '../../lib/agenda';
import { loadSiteData } from '../../lib/data';

const data = await loadSiteData();
const ideaTitles = Object.fromEntries(data.ideas.map((i) => [i.slug, i.short]));
const groups = AGENDA_GROUPS
  .map((g) => ({ ...g, items: data.questions.filter((q) => q.group === g.group) }))
  .filter((g) => g.items.length > 0);
---
<Doc
  title="Question register"
  kicker="Register"
  lede="Every question raised across the pilot: {{questionsTotal}} in total — {{questionsOpen}} open, {{questionsAssumed}} assumed, {{questionsAnswered}} answered, {{questionsClosed}} closed. Settled questions stay here for the record."
  kind="register"
>
  {groups.map((g, i) => (
    <Section n={String(i + 1).padStart(2, '0')} id={g.group} title={g.title}>
      {g.items.map((q) => <QuestionItem q={q} defines ideaTitles={ideaTitles} />)}
    </Section>
  ))}
</Doc>
```

`src/pages/registers/decisions.astro`:
```astro
---
import { getCollection, render } from 'astro:content';
import Doc from '../../layouts/Doc.astro';
import Section from '../../components/Section.astro';
import { loadSiteData } from '../../lib/data';
import { anchorFor, compareIds } from '../../lib/ids';

await loadSiteData(); // validates cross-references before anything renders
const entries = (await getCollection('decisions')).sort((a, b) => compareIds(a.data.id, b.data.id));
const decisions = await Promise.all(entries.map(async (e) => ({ ...e.data, Content: (await render(e)).Content })));
const groups = [
  { n: '01', id: 'uc1', title: 'UC1 — cross-channel proof points', items: decisions.filter((d) => d.useCase === 'uc1') },
  { n: '02', id: 'uc2', title: 'UC2 — partner web content model', items: decisions.filter((d) => d.useCase === 'uc2') },
];
---
<Doc
  title="Decision log"
  kicker="Register"
  lede="Decisions taken so far, why, and what would reopen each one — {{decisions}} recorded. The log is append-only: a changed mind is a new decision, not an edit."
  kind="register"
>
  {groups.map((g) => (
    <Section n={g.n} id={g.id} title={g.title}>
      {g.items.map(({ id, title, resolves, Content }) => (
        <article class="decide" id={anchorFor(id)} data-def={id}>
          <h4><span class="stamp">{id}</span>{title}</h4>
          <Content />
          {resolves.length > 0 && <p><strong>Resolves:</strong> {resolves.join(', ')}</p>}
        </article>
      ))}
    </Section>
  ))}
</Doc>
```

`src/pages/registers/inventory.astro`:
```astro
---
import Doc from '../../layouts/Doc.astro';
import Section from '../../components/Section.astro';
import { loadSiteData } from '../../lib/data';
import { anchorFor } from '../../lib/ids';

const { inventory } = await loadSiteData();
---
<Doc
  title="Component inventory"
  kicker="Register"
  lede="The {{inventoryComponents}} components in the internally approved live inventory, and the content type each one lands as. Client approval of the inventory is pending."
  kind="register"
>
  <Section n="01" id="components" title="Components">
    <div class="scroll">
      <table>
        <thead><tr><th>ID</th><th>Component</th><th>Type</th><th>Variation of</th><th>Matrix status</th><th>Reference</th><th>Screens</th><th>Lands as</th></tr></thead>
        <tbody>
          {inventory.map((c) => (
            <tr id={anchorFor(c.id)} data-def={c.id}>
              <td class="n">{c.id}</td><td>{c.name}</td><td>{c.type}</td>
              <td class="ref">{c.variationOf ?? '—'}</td><td>{c.matrixStatus}</td><td class="ref">{c.reference ?? '—'}</td>
              <td>{c.screens.join(', ')}</td><td class="ref">{c.contentTypes.length > 0 ? c.contentTypes.join(', ') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Section>
</Doc>
```

- [ ] **Step 5: Build and run the anchor check**

Run: `pnpm build && pnpm verify:anchors`
Expected: the only broken links left point at `/decide/`, which Task 10 adds. Every `#q…`, `#dq-…`, `#u…`, `#d-…`, `#ct…` and `#c0…` fragment resolves.

- [ ] **Step 6: Spot-check self-links and the inventory mapping**

Run:
```bash
grep -o 'data-def="DQ-9">.\{0,160\}' dist/registers/questions/index.html | head -1
grep -o '<tr id="c0[0-9]*"' dist/registers/inventory/index.html | wc -l
grep -o 'data-def="C035">.\{0,400\}' dist/registers/inventory/index.html | grep -o 'CT04'
```
Expected:
- The DQ-9 excerpt contains `<span class="qid">DQ-9</span>` with no `idref` link around it, because the article defines DQ-9.
- There are `35` inventory rows.
- C035 lands as CT04.

- [ ] **Step 7: Commit**

```bash
git add src/components/StatusChip.astro src/components/QuestionItem.astro src/pages/registers scripts/verify-anchors.mjs package.json
git commit -m "Add the question, decision and inventory registers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The decision agenda (`/decide`)

**Files:**
- Create: `src/pages/decide.astro`

**Interfaces:**
- Consumes: `buildAgenda`, `QuestionItem`, `Doc`, `Section`, `loadSiteData`.
- Produces: `/decide/`, with one `Section` per non-empty group (ids `blocking`, `scope`, `inputs`, `commercial`, `uc1-design`, `uc2-model`).

- [ ] **Step 1: Create `src/pages/decide.astro`**

```astro
---
import Doc from '../layouts/Doc.astro';
import Section from '../components/Section.astro';
import QuestionItem from '../components/QuestionItem.astro';
import { buildAgenda } from '../lib/agenda';
import { loadSiteData } from '../lib/data';

const data = await loadSiteData();
const agenda = buildAgenda(data.questions);
const ideaTitles = Object.fromEntries(data.ideas.map((i) => [i.slug, i.short]));
---
<Doc
  title="Decision agenda"
  kicker="Workshop"
  lede="{{agendaToConfirm}} positions to confirm and {{agendaToDecide}} questions to decide. To confirm: a position has been proposed and needs a yes or a no. To decide: the pilot needs an answer."
  kind="agenda"
>
  {agenda.map((g, i) => (
    <Section n={String(i + 1).padStart(2, '0')} id={g.group} title={g.title}>
      <p class="sec-note">{g.toConfirm.length} to confirm · {g.toDecide.length} to decide</p>
      {g.toConfirm.length > 0 && (
        <>
          <h3>To confirm</h3>
          {g.toConfirm.map((q) => <QuestionItem q={q} ideaTitles={ideaTitles} />)}
        </>
      )}
      {g.toDecide.length > 0 && (
        <>
          <h3>To decide</h3>
          {g.toDecide.map((q) => <QuestionItem q={q} ideaTitles={ideaTitles} />)}
        </>
      )}
    </Section>
  ))}
</Doc>
```

- [ ] **Step 2: Build and verify links and counts**

Run: `pnpm build && pnpm verify:anchors && grep -o '<p class="lede">[^<]*' dist/decide/index.html`
Expected:
- `0 broken`.
- With the Task 2 defaults, the lede reads `14 positions to confirm and 34 questions to decide.` (Q1, Q2, Q3, Q5, Q8, eight DQs and U3 to confirm; the rest to decide).
- If an owner decision in Task 14 changes the defaults, these numbers change with it, and that is correct.

- [ ] **Step 3: Check that agenda IDs link to the register**

Run: `grep -o 'class="idref" href="/registers/questions/#' dist/decide/index.html | wc -l`
Expected: at least 48, one per agenda item, plus IDs inside the question text.

- [ ] **Step 4: Commit**

```bash
git add src/pages/decide.astro
git commit -m "Add the decision agenda

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: ID tooltips

**Files:**
- Create: `src/scripts/tooltips.ts`
- Modify: `src/layouts/Base.astro` (load the script)

**Interfaces:**
- Consumes: `script#idref-data` (Task 7), `a.idref[data-id]` (Task 5), `statusLabel` (Task 6), and the `#idref-tip` styles (Task 7).
- Produces: a popover `#idref-tip[role=tooltip]` that shows on hover and on focus.

- [ ] **Step 1: Create `src/scripts/tooltips.ts`**

```ts
import { statusLabel } from '../lib/status';
import type { RegistryEntry } from '../lib/types';

type Entry = Omit<RegistryEntry, 'id'>;
const data: Record<string, Entry> = JSON.parse(document.getElementById('idref-data')?.textContent ?? '{}');

const tip = document.createElement('div');
tip.id = 'idref-tip';
tip.setAttribute('role', 'tooltip');
tip.hidden = true;
document.body.append(tip);
let current: HTMLAnchorElement | null = null;

function show(link: HTMLAnchorElement): void {
  const id = link.dataset.id;
  const entry = id ? data[id] : undefined;
  if (!id || !entry) return;
  const head = document.createElement('div');
  head.className = 'tip-head';
  const strong = document.createElement('strong');
  strong.textContent = id;
  head.append(strong);
  const status = statusLabel(entry);
  if (status && entry.status) {
    const chip = document.createElement('span');
    chip.className = `st st-${entry.status}`;
    chip.textContent = status;
    head.append(chip);
  }
  const body = document.createElement('div');
  body.className = 'tip-body';
  body.textContent = entry.label; // text only: labels come from data and are never parsed as HTML
  tip.replaceChildren(head, body);
  tip.hidden = false;
  const rect = link.getBoundingClientRect();
  const width = Math.min(360, window.innerWidth - 32);
  tip.style.width = `${width}px`;
  tip.style.left = `${Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)) + window.scrollX}px`;
  tip.style.top = `${rect.bottom + window.scrollY + 8}px`;
  link.setAttribute('aria-describedby', 'idref-tip');
  current = link;
}

function hide(): void {
  tip.hidden = true;
  current?.removeAttribute('aria-describedby');
  current = null;
}

const idrefFrom = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLAnchorElement>('a.idref') : null);
document.addEventListener('pointerover', (event) => { const link = idrefFrom(event.target); if (link) show(link); });
document.addEventListener('pointerout', (event) => { if (idrefFrom(event.target)) hide(); });
document.addEventListener('focusin', (event) => { const link = idrefFrom(event.target); if (link) show(link); });
document.addEventListener('focusout', (event) => { if (idrefFrom(event.target)) hide(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide(); });
```

- [ ] **Step 2: Load it from `Base.astro`**

Add just before `</body>` in `src/layouts/Base.astro`:
```astro
    <script>
      import '../scripts/tooltips';
    </script>
```

- [ ] **Step 3: Verify in the browser**

Run: `pnpm build && pnpm check && pnpm preview`
With the Playwright MCP, open `/ideas/uc1-solution-architecture/#open`, hover the first `DQ-9` link (`browser_hover`), and take a snapshot.
Expected: a popover with `DQ-9`, an `open` chip and "Who operates and supports the Content Resolution API?". Press `Tab` until an idref has focus: the popover follows focus. `Escape` hides it. Hovering `Q1` shows `answered · awaiting EG`.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/tooltips.ts src/layouts/Base.astro
git commit -m "Show what an ID is on hover and focus

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Presentation mode

**Files:**
- Create: `src/lib/present-keys.ts`, `src/scripts/present.ts`, `src/styles/present.css`
- Modify: `src/layouts/Base.astro` (import the CSS and load the script)
- Test: `tests/present-keys.test.ts`

**Interfaces:**
- Consumes: `[data-slide]` (masthead and sections), `[data-present-toggle]` (top bar).
- Produces:
  - `actionForKey(key, current, total, presenting): PresentAction`, where `PresentAction = { type: 'goto'; index } | { type: 'exit' } | { type: 'theme' } | { type: 'toggle' } | null`
  - `isEditableTarget(target): boolean`
  - `html[data-mode="present"]`, `[data-current]`, and `sessionStorage` keys `eg-workshop-present` and `eg-workshop-theme`

- [ ] **Step 1: Write the failing tests** in `tests/present-keys.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { actionForKey, isEditableTarget } from '../src/lib/present-keys';

describe('actionForKey', () => {
  it('only listens for P when not presenting', () => {
    expect(actionForKey('p', 0, 5, false)).toEqual({ type: 'toggle' });
    expect(actionForKey('ArrowRight', 0, 5, false)).toBeNull();
    expect(actionForKey(' ', 0, 5, false)).toBeNull();
  });
  it('moves forward and back, clamped to the deck', () => {
    expect(actionForKey('ArrowRight', 2, 5, true)).toEqual({ type: 'goto', index: 3 });
    expect(actionForKey(' ', 4, 5, true)).toEqual({ type: 'goto', index: 4 });
    expect(actionForKey('PageDown', 1, 5, true)).toEqual({ type: 'goto', index: 2 });
    expect(actionForKey('ArrowLeft', 0, 5, true)).toEqual({ type: 'goto', index: 0 });
    expect(actionForKey('PageUp', 3, 5, true)).toEqual({ type: 'goto', index: 2 });
  });
  it('jumps to the ends', () => {
    expect(actionForKey('Home', 3, 5, true)).toEqual({ type: 'goto', index: 0 });
    expect(actionForKey('End', 0, 5, true)).toEqual({ type: 'goto', index: 4 });
  });
  it('exits on Escape or P, and toggles the theme on T', () => {
    expect(actionForKey('Escape', 1, 5, true)).toEqual({ type: 'exit' });
    expect(actionForKey('P', 1, 5, true)).toEqual({ type: 'exit' });
    expect(actionForKey('t', 1, 5, true)).toEqual({ type: 'theme' });
  });
  it('ignores other keys, leaving ArrowDown to scroll a tall slide', () => {
    expect(actionForKey('ArrowDown', 1, 5, true)).toBeNull();
    expect(actionForKey('x', 1, 5, true)).toBeNull();
  });
});

describe('isEditableTarget (Review Focus 2)', () => {
  it('treats form fields and contenteditable as editable', () => {
    expect(isEditableTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isEditableTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditableTarget({ tagName: 'SELECT' })).toBe(true);
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });
  it('treats everything else as not editable', () => {
    expect(isEditableTarget({ tagName: 'DIV' })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test tests/present-keys.test.ts`
Expected: FAIL, because the module cannot be resolved.

- [ ] **Step 3: Create `src/lib/present-keys.ts`**

```ts
export type PresentAction =
  | { type: 'goto'; index: number }
  | { type: 'exit' }
  | { type: 'theme' }
  | { type: 'toggle' }
  | null;

export function actionForKey(key: string, current: number, total: number, presenting: boolean): PresentAction {
  if (!presenting) return key === 'p' || key === 'P' ? { type: 'toggle' } : null;
  const last = Math.max(total - 1, 0);
  switch (key) {
    case 'ArrowRight': case ' ': case 'PageDown': return { type: 'goto', index: Math.min(current + 1, last) };
    case 'ArrowLeft': case 'PageUp': return { type: 'goto', index: Math.max(current - 1, 0) };
    case 'Home': return { type: 'goto', index: 0 };
    case 'End': return { type: 'goto', index: last };
    case 'Escape': case 'p': case 'P': return { type: 'exit' };
    case 't': case 'T': return { type: 'theme' };
    default: return null;
  }
}

export function isEditableTarget(target: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!target) return false;
  return target.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName ?? '');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test tests/present-keys.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Create `src/styles/present.css` and `src/scripts/present.ts`**

`src/styles/present.css`:
```css
html[data-mode="present"]{font-size:125%}
html[data-mode="present"] .topbar,
html[data-mode="present"] nav.index,
html[data-mode="present"] main > footer{display:none}
html[data-mode="present"] .cols{display:block}
html[data-mode="present"] [data-slide]:not([data-current]){display:none}
html[data-mode="present"] [data-slide][data-current]{min-height:100vh;padding-top:48px;margin:0}
html[data-mode="present"] header.mast[data-current]{display:flex;flex-direction:column;justify-content:center;border-bottom:0}
#present-counter{display:none}
html[data-mode="present"] #present-counter{display:block;position:fixed;right:20px;bottom:16px;z-index:30;font-family:var(--mono);font-size:.8125rem;color:var(--ink-soft);background:var(--card);border:1px solid var(--rule);border-radius:3px;padding:4px 10px}
```

`src/scripts/present.ts`:
```ts
import { actionForKey, isEditableTarget } from '../lib/present-keys';

const MODE_KEY = 'eg-workshop-present';
const THEME_KEY = 'eg-workshop-theme';
const root = document.documentElement;
const slides = [...document.querySelectorAll<HTMLElement>('[data-slide]')];
const toggles = [...document.querySelectorAll<HTMLButtonElement>('[data-present-toggle]')];
const counter = document.createElement('div');
counter.id = 'present-counter';
counter.setAttribute('aria-live', 'polite');
document.body.append(counter);
let current = 0;

// Storage can be unavailable (private windows, blocked site data): the mode then lasts for this page only.
const session = {
  get(key: string): string | null { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string | null): void {
    try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch { /* see above */ }
  },
};
const presenting = () => root.dataset.mode === 'present';

function show(index: number): void {
  if (slides.length === 0) return;
  current = index;
  slides.forEach((slide, i) => slide.toggleAttribute('data-current', i === index));
  counter.textContent = `${index + 1}/${slides.length}`;
  const id = slides[index].id;
  history.replaceState(null, '', id ? `#${id}` : location.pathname);
  window.scrollTo(0, 0);
}

function slideInView(): number {
  const fromHash = slides.findIndex((s) => s.id && `#${s.id}` === location.hash);
  if (fromHash >= 0) return fromHash;
  const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  const containing = target ? slides.findIndex((s) => s.contains(target)) : -1;
  if (containing >= 0) return containing;
  const visible = slides.findIndex((s) => s.getBoundingClientRect().bottom > 80);
  return visible >= 0 ? visible : 0;
}

function enter(start = slideInView()): void {
  root.dataset.mode = 'present';
  session.set(MODE_KEY, '1');
  show(start);
}

function exit(): void {
  delete root.dataset.mode;
  session.set(MODE_KEY, null);
  slides.forEach((slide) => slide.removeAttribute('data-current'));
  slides[current]?.scrollIntoView();
}

function toggleTheme(): void {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  session.set(THEME_KEY, root.dataset.theme);
}

const savedTheme = session.get(THEME_KEY);
if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
if (slides.length > 0) toggles.forEach((button) => { button.hidden = false; });
toggles.forEach((button) => button.addEventListener('click', () => (presenting() ? exit() : enter())));

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isEditableTarget(event.target as HTMLElement | null) || document.querySelector('dialog[open]')) return;
  const action = actionForKey(event.key, current, slides.length, presenting());
  if (!action) return;
  event.preventDefault();
  if (action.type === 'toggle') enter();
  else if (action.type === 'exit') exit();
  else if (action.type === 'theme') toggleTheme();
  else show(action.index);
});

// An in-page link (e.g. CT01 on the UC2 page) moves to the slide that holds its target.
window.addEventListener('hashchange', () => {
  if (!presenting()) return;
  const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  const index = target ? slides.findIndex((s) => s.contains(target)) : -1;
  if (index >= 0 && index !== current) { show(index); target?.scrollIntoView(); }
});

if (session.get(MODE_KEY) === '1') enter();
```

- [ ] **Step 6: Load CSS and script from `Base.astro`**

Add `import '../styles/present.css';` after the `site.css` import, and add `import '../scripts/present';` inside the existing `<script>` block.

- [ ] **Step 7: Verify in the browser**

Run: `pnpm build && pnpm check && pnpm preview`. With the Playwright MCP, open `/ideas/uc2-content-model/` and scroll to §02.
- Press `P`: the §02 slide shows alone, the type is larger, the counter reads `3/6`, and the URL ends in `#disposition`.
- Press `→`: §03 shows. Press `↓`: the long table scrolls. Press `Home`: the masthead shows. Press `T`: the theme flips.
- Click an idref to `/registers/questions/#…`: the register opens in presentation mode. `Back` returns to the same slide.
- Press `/`, then type `p` and a space into the search box: the text goes into the field and the slide doesn't change (Review Focus 2; the search modal lands in Task 13, so re-run this check there).
- Press `Esc`: consult mode returns, at the slide you were on.
- Screenshot the masthead slide and §03 in both themes at 1440 px.

- [ ] **Step 8: Commit**

```bash
git add src/lib/present-keys.ts src/scripts/present.ts src/styles/present.css src/layouts/Base.astro tests/present-keys.test.ts
git commit -m "Add presentation mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Search

**Files:**
- Create: `src/lib/search-id.ts`, `src/components/SearchModal.astro`, `src/scripts/search.ts`
- Modify: `src/layouts/Base.astro`, and the `build` script in `package.json`
- Test: `tests/search-id.test.ts`

**Interfaces:**
- Consumes: `script#idref-data`, `[data-search-open]`, Pagefind's `/pagefind/pagefind.js` (created by `pagefind --site dist`), and `data-pagefind-meta="kind:…"`.
- Produces: `matchId(query: string, ids: Iterable<string>): string | null`, and `dialog#search`.

- [ ] **Step 1: Write the failing tests** in `tests/search-id.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { matchId } from '../src/lib/search-id';

const ids = ['DQ-9', 'DQ-10', 'Q6b', 'CT01'];

describe('matchId (Review Focus 5)', () => {
  it('matches regardless of case and surrounding space', () => {
    expect(matchId('dq-9 ', ids)).toBe('DQ-9');
    expect(matchId('q6B', ids)).toBe('Q6b');
    expect(matchId(' CT01', ids)).toBe('CT01');
  });
  it('needs the whole ID', () => {
    expect(matchId('DQ-1', ids)).toBeNull();
    expect(matchId('dq 9', ids)).toBeNull();
    expect(matchId('', ids)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test tests/search-id.test.ts`
Expected: FAIL, because the module cannot be resolved.

- [ ] **Step 3: Create `src/lib/search-id.ts`**

```ts
/** Exact ID match, ignoring case and surrounding whitespace; Pagefind tokenises "DQ-9" into noise. */
export function matchId(query: string, ids: Iterable<string>): string | null {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return null;
  for (const id of ids) if (id.toLowerCase() === wanted) return id;
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test tests/search-id.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Create `src/components/SearchModal.astro` and `src/scripts/search.ts`**

`src/components/SearchModal.astro`:
```astro
<dialog id="search" class="search" aria-label="Search">
  <form class="search-form" role="search">
    <input type="search" id="search-input" placeholder="Search, or type an ID such as DQ-9" autocomplete="off" aria-controls="search-results" />
    <button type="button" data-search-close aria-label="Close search">Esc</button>
  </form>
  <p class="search-note" id="search-note" hidden></p>
  <ul id="search-results" class="search-results"></ul>
</dialog>
```

`src/scripts/search.ts`:
```ts
import { isEditableTarget } from '../lib/present-keys';
import { matchId } from '../lib/search-id';

type PagefindData = { url: string; excerpt: string; meta: Record<string, string> };
type Pagefind = { search: (query: string) => Promise<{ results: { data: () => Promise<PagefindData> }[] }> };
type Item = { href: string; kind: string; title: string; excerpt: string; excerptIsHtml: boolean };

const PAGEFIND_URL = '/pagefind/pagefind.js';
const dialog = document.getElementById('search') as HTMLDialogElement | null;

if (dialog) {
  const input = dialog.querySelector<HTMLInputElement>('#search-input')!;
  const list = dialog.querySelector<HTMLUListElement>('#search-results')!;
  const note = dialog.querySelector<HTMLParagraphElement>('#search-note')!;
  const form = dialog.querySelector<HTMLFormElement>('form')!;
  const registry: Record<string, { label: string; href: string }> = JSON.parse(document.getElementById('idref-data')?.textContent ?? '{}');
  let pagefind: Promise<Pagefind | null> | undefined;
  // The index exists only in the built site; under `astro dev` the import fails and search says so.
  const loadPagefind = () => (pagefind ??= import(/* @vite-ignore */ PAGEFIND_URL).then((m) => m as Pagefind).catch(() => null));
  let sequence = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const open = () => { dialog.showModal(); input.select(); };
  document.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('click', open));
  dialog.querySelector('[data-search-close]')?.addEventListener('click', () => dialog.close());
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (dialog.open || isEditableTarget(event.target as HTMLElement | null)) return;
    event.preventDefault();
    open();
  });

  function render(items: Item[]): void {
    list.replaceChildren(...items.map((item) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      const kind = Object.assign(document.createElement('span'), { className: 'r-kind', textContent: item.kind });
      const title = Object.assign(document.createElement('span'), { className: 'r-title', textContent: item.title });
      const excerpt = document.createElement('span');
      excerpt.className = 'r-excerpt';
      // Pagefind excerpts are escaped HTML with <mark> highlights; registry labels are plain text.
      if (item.excerptIsHtml) excerpt.innerHTML = item.excerpt; else excerpt.textContent = item.excerpt;
      a.append(kind, title, excerpt);
      li.append(a);
      return li;
    }));
  }

  async function run(query: string): Promise<void> {
    const mine = ++sequence;
    const items: Item[] = [];
    const id = matchId(query, Object.keys(registry));
    if (id) items.push({ href: registry[id].href, kind: id, title: `Go to ${id}`, excerpt: registry[id].label, excerptIsHtml: false });
    const wantsFullText = query.trim().length >= 2;
    const pf = wantsFullText ? await loadPagefind() : null;
    if (mine !== sequence) return;
    note.hidden = !(wantsFullText && !pf);
    note.textContent = 'Full-text search runs on the built site: pnpm build && pnpm preview.';
    if (pf) {
      const { results } = await pf.search(query);
      const data = await Promise.all(results.slice(0, 8).map((r) => r.data()));
      if (mine !== sequence) return;
      for (const d of data) items.push({ href: d.url, kind: d.meta.kind ?? '', title: d.meta.title ?? d.url, excerpt: d.excerpt, excerptIsHtml: true });
    }
    render(items);
  }

  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => run(input.value), 150); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    list.querySelector<HTMLAnchorElement>('a')?.click();
  });
}
```

- [ ] **Step 6: Wire it into `Base.astro` and the build**

In `src/layouts/Base.astro`, add `import SearchModal from '../components/SearchModal.astro';` to the frontmatter, render `<SearchModal />` right after `<slot />`, and add `import '../scripts/search';` inside the existing `<script>` block.
In `package.json`, change `"build"` to `"astro build && pagefind --site dist"`.

- [ ] **Step 7: Verify search, including the dev notice**

Run: `pnpm build && pnpm check && ls dist/pagefind/pagefind.js && pnpm preview`
With the Playwright MCP, press `/` on the home page:
- Type `dq-9`: the first result is "Go to DQ-9", followed by page results.
- Type `resolver`: the UC1 page shows up with a highlighted excerpt and kind `idea`.
- Press `Enter`: the browser follows the first result.
- Repeat the Task 12 Step 7 check: with the search box focused, typing `p` and a space doesn't change the slide.

Then run `pnpm dev`, open search and type `resolver`.
Expected under dev: the notice "Full-text search runs on the built site…" appears, `dq-9` still resolves, and the console shows no uncaught error. Finish with `pnpm astro dev stop`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/search-id.ts src/components/SearchModal.astro src/scripts/search.ts src/layouts/Base.astro package.json tests/search-id.test.ts
git commit -m "Add Pagefind search with an ID shortcut

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Resolve discrepancies, remove the old documents, rewrite README and CLAUDE.md

**Files:**
- Modify: `docs/superpowers/migration-discrepancies.md`, plus whichever sources the owner's decisions touch (`data/questions.yaml`, `model/uc2-matrix.json`, `src/content/ideas/*.mdx`, `scripts/fidelity-allowlist.json`)
- Delete: `docs/01-pilot-backlog.html`, `docs/02-uc1-solution-architecture.html`, `docs/03-uc2-content-model.html`, `decisions/decision-log.md`, `decisions/open-questions.md`
- Rewrite: `README.md`, `CLAUDE.md`

- [ ] **Step 1: Take each discrepancy to the owner**

Open `docs/superpowers/migration-discrepancies.md` and ask the user, one item at a time with AskUserQuestion, whether to keep each default or change it.
For every change:
- Question wording, positions or `confirmedByEG` → edit `data/questions.yaml`.
- CT23 → edit `model/uc2-matrix.json` `components[CT23].summary` or `.purpose`, then run `make xlsx` if `purpose` changed.
- Doc 02 wording → edit `src/content/ideas/uc1-solution-architecture.mdx`, and add an entry to `scripts/fidelity-allowlist.json`:
  ```json
  { "page": "uc1-solution-architecture", "from": "<original sentence>", "to": "<new sentence>", "reason": "Backlog no longer on the site (discrepancy 2)" }
  ```
Tick each item as it is settled. Do not continue until every box is ticked.

- [ ] **Step 2: Rebuild and re-verify with the decisions applied**

Run: `pnpm test && pnpm check && pnpm build && pnpm verify && make check`
Expected: every command passes, and `fidelity: ok` is printed.

- [ ] **Step 3: Delete the migrated sources**

```bash
git rm docs/01-pilot-backlog.html docs/02-uc1-solution-architecture.html docs/03-uc2-content-model.html decisions/decision-log.md decisions/open-questions.md
pnpm build && pnpm verify
```
Expected: still green. `verify-fidelity` reads the originals from `6c8dd77`, not from the working tree.

- [ ] **Step 4: Rewrite `README.md`**

````markdown
# EG CMS Pilot — Contentful

Working repository for Globant's part in the Expedia Group CMS pilot, which evaluates
Contentful across two use cases. It is an Astro site used at the joint Expedia Group /
Contentful / Globant workshop to present ideas and take decisions.

Owner: Facundo — DXP Technical Director, Martech Studio.

Nothing here has been shared with the client yet.

---

## Running the site

```bash
pnpm install
pnpm dev        # http://localhost:4321 — without a terminal it detaches; stop it with `pnpm astro dev stop`
pnpm build      # static site in dist/, plus the Pagefind search index
pnpm preview    # serves dist/; full-text search only works here
pnpm test       # unit tests
pnpm check      # type check
pnpm verify     # after a build: internal links, and fidelity against the original documents
```

To share it, zip `dist/` and have the recipient run `npx serve dist`.

On any page: `P` presents it one section per screen (`←` `→`, `Home` `End`, `T` light/dark,
`Esc` to leave), `/` opens search, and hovering an ID such as `DQ-9` shows what it is.

---

## What's here

```
src/content/ideas/      The ideas presented at the workshop — one MDX file each
src/content/fragments/  Diagrams and preformatted blocks, kept as raw HTML
data/questions.yaml     Q1–Q26, Q6b (raised with EG) and DQ-1–DQ-10 (UC1 design)
model/uc2-matrix.json   UC2 content model and U1–U11. Source of truth for the workbook
decisions/              One file per decision, D-NN.md. Append-only
sources/                Client inputs. Read-only by convention
exports/                Generated workbook. Do not edit by hand
scripts/                build_xlsx.py and the verify scripts
```

Pages: `/` home · `/ideas/<slug>/` · `/decide/` decision agenda ·
`/registers/questions/` · `/registers/decisions/` · `/registers/inventory/`.

---

## Recording a workshop decision

1. Update the question in `data/questions.yaml` (U questions: `open_questions` in
   `model/uc2-matrix.json`): set `status`, write the `answer`, and set `confirmedByEG: true`
   once EG accepts it.
2. Add `decisions/D-NN.md` with frontmatter `id`, `title`, `useCase` (`uc1` or `uc2`) and
   `resolves: [Q…]`. UC1 decisions number from D-10, UC2 from D-26. Never edit an existing
   decision: a changed mind is a new one.
3. `pnpm build`. The agenda drops what was settled, and the registers show the outcome.
4. If a U question changed, run `make xlsx`.

The build fails, naming the file and ID, on a misspelt status, a repeated ID, a `resolves`
that points nowhere, or an `assumed` question without a `position`.

## Adding an idea

Create `src/content/ideas/<slug>.mdx` with frontmatter `title`, `short`, `kicker`, `lede`,
`order` and `meta`, and a body of `<Section n="01" id="…" title="…">` blocks. It appears on
the home page, in the top bar and in search on the next build.

A number that comes from the data is written `<Fact k="contentTypes" />` in the body, or
`{{contentTypes}}` in frontmatter and section titles. The keys are listed in `src/lib/facts.ts`.

---

## Rebuilding the workbook

The workbook is generated. Edit `model/uc2-matrix.json`, never the `.xlsx`.

```bash
make xlsx          # or: python3 scripts/build_xlsx.py model/uc2-matrix.json -o exports/EG-UC2-content-model-matrix.xlsx
make check         # counts, and unique content type IDs
```

Requires `openpyxl`.

---

## Conventions

**Terminology.** The site avoids language that reads as correcting earlier work: no
"rejected", no "reclassified". Components are *unified*, *kept distinct*, or *structural*.
This goes in front of the client.

**IDs.** `Q1–Q26` and `Q6b` are questions raised with EG, `DQ-1–DQ-10` are UC1 design
questions, `U1–U11` are UC2 questions, `D-NN` are decisions, `CT01–CT23` are UC2 content
types and `C001–C035` are inventory components. Never renumber any of them: the mapping is
the client's traceability. Every ID written in the prose is linked automatically.

**Numbers.** Counts that come from the data are computed, never typed.

---

## Known cross-document dependencies

- **UC1 and UC2 are coupled.** Partner web consumes the same Content Resolution API, so
  UC2's content model needs a proof-point block it does not have yet. Not added — waiting on
  EG confirming partner web is in scope.
- **The UC1 resolver is one custom runtime component.** Globant builds, EG hosts, support
  undecided (DQ-9).
- **Grammatical agreement is deferred** out of the UC1 POC (D-06). Stated on the site; must be
  raised at the workshop rather than left to be noticed.
````

- [ ] **Step 5: Rewrite `CLAUDE.md`**

````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Globant's (GL) workspace for the Expedia Group (EG) CMS pilot on Contentful (CF): a static Astro
site used at an EG / CF / GL workshop to **present ideas and take decisions**. Backlog shaping
is deliberately out of scope. Content and UI are in English, because they go in front of the client.

## Commands

```bash
pnpm dev              # dev server; without a TTY it detaches — stop with `pnpm astro dev stop`
pnpm build            # astro build + pagefind --site dist
pnpm preview          # serve dist/ (search only works on the built site)
pnpm test             # vitest; one file: pnpm test tests/linkify.test.ts; one test: add -t "<name>"
pnpm check            # astro check (types)
pnpm verify           # after build: verify-anchors (every internal link/fragment) + verify-fidelity
make xlsx | make check   # regenerate / sanity-check the UC2 workbook from model/uc2-matrix.json
```

## Architecture

- **Data, one place per fact.** `src/content.config.ts` loads every collection: ideas (MDX),
  decisions (`decisions/D-NN.md`), questions (`data/questions.yaml`), UC2 questions,
  content types and consolidation (parts of `model/uc2-matrix.json`), and the inventory
  (parsed from `sources/component-inventory.md` by `src/lib/inventory.ts`). Schemas are in
  `src/lib/schemas.ts`.
- **`loadSiteData()`** (`src/lib/data.ts`) is the only way pages read data. It joins the
  collections, sorts by `compareIds`, and runs `assertValid` for the cross-collection rules
  zod can't express. Pure derivations on top of it: `buildRegistry` (ID → label, status,
  href), `computeFacts` (counts), `buildAgenda` (the `/decide` view).
- **ID linking and page index happen after rendering**, in `src/middleware.ts` →
  `enhanceHtml` (`src/lib/enhance.ts`). It runs in dev and during static prerendering. Astro 7
  renders Markdown with its native processor, which does not run rehype plugins, so do not
  add a rehype plugin for this. Contract: a definition site carries
  `id="<lower-cased ID>" data-def="<ID>"`; slides are `[data-slide]`; sections carry
  `data-n`, `data-title` and optionally `data-nav`; `nav[data-index]` is filled
  automatically.
- **Layouts.** `Base.astro` holds the top bar, the registry JSON (`script#idref-data`) and
  the three client scripts (`src/scripts/{tooltips,present,search}.ts`). `Doc.astro` holds
  the masthead, index and `main[data-pagefind-body]`, and is used by ideas, `/decide` and
  the registers.
- **Numbers from data** are `<Fact k="…"/>` in MDX bodies, and `{{key}}` in frontmatter and
  `Section` titles (`interpolateFacts`). Unknown keys fail the build.

## Gotchas

- MDX: escape literal `{`/`}` as `\{`/`\}`, never write HTML comments, and put `<pre>` or
  SVG blocks in `src/content/fragments/*.html`, imported with `?raw` and rendered with
  `<Fragment set:html={…} />`. MDX collapses pre whitespace and reads braces as expressions.
- `markdown.smartypants` is off on purpose (straight quotes, fidelity).
- `glob()` ids are lower-cased file names. Use `data.id` for decision IDs.
- TypeScript is pinned to 6.x because `@astrojs/check` does not accept 7.
- `scripts/verify-fidelity.mjs` compares against the original documents at commit `6c8dd77`.
  An intentional wording change needs an entry in `scripts/fidelity-allowlist.json`.

## Conventions that matter

- **Client-facing terminology:** no "rejected", no "reclassified". Components are
  *unified*, *kept distinct*, or *structural*.
- **Stable IDs, never renumber:** `Q1–Q26`, `Q6b`, `DQ-1–DQ-10`, `U1–U11`, `D-NN`,
  `CT01–CT23`, `C001–C035`.
- **Recording a decision:** update the question's `status`, `answer` and `confirmedByEG`
  (`data/questions.yaml`, or the JSON for U*), then add a new `decisions/D-NN.md` with
  `resolves`. Never edit past decisions. UC1 numbers from D-10, UC2 from D-26.
- `exports/*.xlsx` is only regenerated (`make xlsx`); `sources/` is read-only; the
  inventory's analyst notes are never published.

## Known couplings

- UC2 needs a proof-point block once EG confirms partner web is in scope (it consumes the UC1
  Content Resolution API).
- The UC1 resolver is the only custom runtime component. Support is undecided (DQ-9).
- Grammatical agreement is deferred (D-06) and must be raised at the workshop.
````

- [ ] **Step 6: Final verification**

Run:
```bash
pnpm test && pnpm check && pnpm build && pnpm verify && make check
git status --short
```
Expected: everything passes. `git status` shows only the README, CLAUDE.md and deletion changes staged for this task, and `.migrate/` does not appear because it is ignored.
Then take a last round of Playwright screenshots (home, both ideas, `/decide`, the three registers) at 1440 px and 390 px, in light and dark, one of them in presentation mode. Check that nothing overflows sideways.

- [ ] **Step 7: Commit**

```bash
git add -A README.md CLAUDE.md docs/superpowers/migration-discrepancies.md data model src scripts exports
git commit -m "Retire the HTML deliverables; document the workshop site

The three HTML documents and the markdown registers now live in the
site and its data. README and CLAUDE.md describe how to run it, add an
idea and record a workshop decision.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
