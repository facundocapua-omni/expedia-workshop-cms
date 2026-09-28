# Astro workshop site — design

Date: 2026-09-28 · Branch: `feat/astro-site` · Status: awaiting review

## 1. Goal

Replace the three hand-written deliverables in `docs/*.html` with one Astro site that
presents the pilot's ideas at a joint Expedia Group (EG) / Contentful (CF) / Globant (GL)
workshop, and stays usable as a reference before and after it.

### What was agreed

- **Astro replaces the HTML deliverables.** Content lives in the Astro project; the three
  `docs/*.html` files are deleted (git history keeps them).
- **One content, two views.** *Consult mode* is the long-form document. *Presentation mode*
  (key `P`) shows one numbered section per screen.
- **Ideas are extensible.** Today: pilot backlog, UC1 architecture, UC2 content model. Adding
  an idea means adding one MDX file.
- **Static and local.** `astro build` output, run with `pnpm preview` or `npx serve dist`.
  Opening from `file://` is not a requirement.
- **v1 consult features:** linked IDs with tooltips, global search, register pages
  (questions, decisions, inventory). Filterable tables are out of scope.

### Assumptions

- Site content and UI stay in English, like the current deliverables.
- The Astro project lives at the repo root. `model/`, `scripts/build_xlsx.py`, `Makefile` and
  `exports/` keep working as they do today.
- Only the component table from `sources/component-inventory.md` is published. The analyst
  notes ("QUESTION FOR THE ANALYST", "Rejected components") are not: they appear in no current
  deliverable and conflict with the client-facing terminology rule.

### Success criteria

1. No visible text from the original documents is lost. The fidelity diff (§8.1) is empty, or
   every remaining difference is explained and approved.
2. Every number that has a data source is computed from it.
3. Adding an idea means creating one MDX file with no other code changes.
4. Every linked ID resolves to an existing anchor, and the build fails otherwise.

## 2. Architecture

Astro (latest) with MDX, static output, pnpm. Client-side JavaScript is limited to three small
vanilla scripts: presentation mode, ID tooltips and the search modal. There is no UI
framework.

```
src/
  content/ideas/            pilot-backlog.mdx · uc1-solution-architecture.mdx · uc2-content-model.mdx
  components/               Section, Story, StoryList, Question, QuestionList, Chip, Fact,
                            Linked, IdLink, ContentTypeTable, diagrams/*
  layouts/                  Base.astro (tokens, theme, top bar) · Idea.astro (masthead, index, sections)
  lib/                      sources.ts (fs loaders) · registry.ts · linkify.ts · facts.ts
                            · inventory.ts (markdown table parser) · rehype-idrefs.ts
  scripts/                  present.ts · tooltips.ts · search.ts
  styles/                   tokens.css · prose.css
  pages/                    index.astro · ideas/[slug].astro
                            · registers/{questions,decisions,inventory}.astro
  content.config.ts         collections + zod schemas
data/
  questions.yaml            Q1–Q26, Q6b, DQ-1–DQ-10
  stories.yaml              43 stories
decisions/                  D-01.md … D-25.md (one per decision)
model/uc2-matrix.json       unchanged except the open_questions additions in §3.3
sources/                    untouched
tests/                      Vitest unit tests + scripts/verify-* build checks
```

Routes: `/`, `/ideas/<slug>/`, `/registers/questions/`, `/registers/decisions/`,
`/registers/inventory/`. Search is a modal, not a route. Idea slugs drop the numeric prefix;
order comes from frontmatter.

## 3. Data model

Rule: **every fact is defined in exactly one place.** Pages render from that place.

### 3.1 Ideas (`src/content/ideas/*.mdx`)

Frontmatter: `title`, `kicker`, `lede`, `order` (number), `meta` (list of short strings;
items may contain `<Fact>`). The body is a sequence of `<Section n="03" id="ref" title="…">`
blocks. The masthead is slide 0, and each `Section` is one slide.

### 3.2 Questions (`data/questions.yaml`)

One record per backlog or UC1 design question:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `Q1`…`Q26`, `Q6b`, `DQ-1`…`DQ-10` |
| `group` | enum | `blocking`, `scope`, `inputs`, `commercial`, `uc1-design` (the register's headings) |
| `question` | string | short form, from the register |
| `detail` | string, optional | long reasoning, from doc 01's `.qb` blocks |
| `owner` | string, optional | |
| `status` | enum | `open`, `assumed`, `answered`, `closed` |
| `assumption` | string, optional | DQ working assumption |
| `answer` | string, optional | from "Answered — kept for the record" |
| `source` | enum | `01`, `02`, `03` |

Doc 01's questions section and `/registers/questions/` both render from this file.

### 3.3 UC2 questions (`model/uc2-matrix.json → open_questions`)

UC2 questions stay in the JSON because they feed the workbook. Each entry gains `id` and
`status`. The register and the JSON currently disagree, and this is resolved as agreed on
2026-09-28 by taking the union and keeping the register's IDs:

| ID | Question (short) | Origin |
| --- | --- | --- |
| U1 | Recommended-for-you grid: author-picked or query-driven | JSON #1 |
| U2 | Lead capture form: endpoint, fields, consent | JSON #2 |
| U3 | Calculator formula authorable or in the front end | **register only.** Added to the JSON as `assumed` (doc 03: formula in the front end, copy in the CMS) |
| U4 | Comparison table on mobile | JSON #3 |
| U5 | Localised URL slugs | JSON #4 |
| U6 | Per-locale imagery | JSON #5 |
| U7 | OneTrust as an external script | JSON #6 |
| U8 | Header mobile menu depth 3 | JSON #7 |
| U9 | Roles × blocks × templates | JSON #8 |
| U10 | Data layer per block | JSON #9 |
| U11 | Which Contentful plan is in scope | **JSON only** (#10) |

This brings the total to **48 questions** (27 + 10 + 11). The JSON gains one entry, so the
workbook is regenerated (`make xlsx`). Before that, confirm that `build_xlsx.py` ignores the
new `id`/`status` keys, and that the only workbook change is the added row and the
open-questions count.

### 3.4 Stories (`data/stories.yaml`)

`id` (`US-A1`…), `useCase` (A–H group as in doc 01), `title`, `caps` (list of `CMS-NN`),
`blockedBy` (list of question IDs), `dependent` (bool, the current `story dep` class),
`delivery` (1–5, from doc 01 §04 "Build versus configure"), `narrative`, `acceptance`
(list). The delivery tiers are 1 = configuration only, 2 = configuration with the right
licence, 3 = custom development on the Contentful side, 4 = custom development outside
Contentful, and 5 = no build.

### 3.5 Decisions (`decisions/D-NN.md`)

Frontmatter: `id`, `title`, `useCase` (`uc1` or `uc2`). The body is the existing prose
(*Why*, *Consequence*, *Reopens if*, *Cost*, *Open*). The log stays append-only: a new
decision means a new file, and past files are never rewritten.

### 3.6 Inventory

`lib/inventory.ts` parses the "Approved components (internal)" table in
`sources/component-inventory.md` at build time, so the source file is never copied or
edited. The C→CT mapping is derived from `components[].consolidates` in the JSON (entries
starting with a `C0NN` ID).

### 3.7 Facts (`lib/facts.ts`)

Named counts computed from the data, used as `<Fact k="…"/>` in MDX and frontmatter:
`stories`, `storiesConfiguration` (tiers 1+2), `storiesDevelopment` (tiers 3+4),
`storiesNoBuild`, `backlogQuestions`, `questionsTotal`, `questionsByStatus.*`,
`designQuestions`, `uc2Questions`, `contentTypes`, `inventoryComponents`, `decisions`.
Numbers without a data source ("46 capabilities", sizing arithmetic, `CMS-47`, example
values such as `"views": 47`) stay as text.

### 3.8 Validation

Zod schemas in `content.config.ts` fail the build on a duplicate ID, an unknown enum value, a
`caps` entry that doesn't match `CMS-\d{2}`, or a `blockedBy` entry that isn't a known
question ID. `make check` stays as it is.

## 4. ID registry and linking

### 4.1 Registry (`lib/registry.ts`)

`Map<id, { kind, label, status?, href }>`, built from the §3 sources:

| Family | Source | `href` |
| --- | --- | --- |
| `Q*`, `DQ-*` | `data/questions.yaml` | `/registers/questions/#dq-9` |
| `U*` | JSON `open_questions` | `/registers/questions/#u3` |
| `D-*` | `decisions/*.md` | `/registers/decisions/#d-05` |
| `US-*` | `data/stories.yaml` | `/ideas/pilot-backlog/#us-a1` |
| `CT*` | JSON `components` | `/ideas/uc2-content-model/#ct01` |
| `C0**` | inventory table | `/registers/inventory/#c021` |

Anchors are the lower-cased ID. `CMS-NN` has no definition source in the repo (only the
client `.docx`), so it is not in the registry and renders as a plain chip.

The registry cannot come from content collections, because rehype plugins are configured in
`astro.config` before collections exist. So `lib/sources.ts` reads the files directly (fs +
YAML parser). The plugin and the pages share that loader, and zod validation in the
collections guarantees the two readings agree.

### 4.2 Linkify (`lib/linkify.ts`)

`linkify(text, registry) → Array<string | { id }>`. The regex is built only from registry
keys, ordered longest first, with `(?<![\w-])…(?![\w-])` boundaries. This gives three
guarantees: `DQ-10` never matches as `DQ-1`, unregistered look-alikes (`Q99`, `Q1 2027`
inside a word) stay text, and a range such as `Q1–Q26` links both ends.

### 4.3 Two call sites, one markup

- **MDX prose.** `rehype-idrefs` walks the text nodes. It skips text inside `a`, `code` and
  `pre`, and inside any element whose `data-def` equals the ID (the definition site).
- **Data strings** rendered by components use `<Linked text={…}/>`, which calls the same
  function.

Both call sites emit `<a class="idref" data-id="DQ-9" href="…">DQ-9</a>`. Definition sites
render `id="<anchor>" data-def="<ID>"`.

### 4.4 Tooltips

Each page embeds the registry once as JSON (about 150 entries, about 15 KB).
`scripts/tooltips.ts` shows a popover on hover and on keyboard focus with the ID, the short
label and a status chip. Without JavaScript the link still works.

## 5. Layout

- `styles/tokens.css` merges the three documents' tokens (`--paper --card --ink --ink-soft
  --rule --rule-soft --accent --flag --ok --warm` plus `-soft`), with dark mode through
  `prefers-color-scheme` and the existing `data-theme` override.
- Fonts are self-hosted through `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono`,
  so the workshop doesn't depend on network access.
- `Idea.astro` renders the masthead from frontmatter and the sticky index from the
  `Section` headings. The index is generated, never hand-written.
- Home lists ideas by `order` and links to the three registers and to search. The top bar
  has home, ideas, registers and search.
- Component-specific CSS (story, question, trap, figure, pill) lives with its component.
  Shared prose styles live in `prose.css`, which ends today's triple copy.
- Layouts must work at 390 px with no horizontal page scroll. Wide tables scroll inside their
  own container, as they do today.

## 6. Presentation mode (`scripts/present.ts`)

- `P` or the masthead button toggles `data-mode="present"` on `<html>`. Slides are the
  masthead plus each `Section`. The index and top bar are hidden, the base type scales to
  1.25×, and a counter shows `3/15`.
- Keys: `→`, `←`, `Space` and `PageDown`/`PageUp` move between slides. `Home`/`End` go to the
  first and last slide, `Esc` exits, and `T` toggles light/dark. `↓`/`↑` scroll inside a
  section taller than the viewport.
- Entering the mode starts at the section currently in view. The URL hash tracks the current
  slide, so a reload or a shared link keeps the position.
- The mode persists in `sessionStorage`, so following an idref during a presentation opens
  the register in presentation mode and Back returns to the same slide. Pages without
  sections only get the larger type. `sessionStorage` access is wrapped so that a failure
  falls back to consult mode.

## 7. Search

- Pagefind indexes `dist/` after `astro build`. Only `data-pagefind-body` content is indexed
  (not the nav or the tooltip JSON), and a `data-pagefind-filter` of `idea` or `register`
  distinguishes the two kinds of result.
- The modal opens with `/` or from the top bar.
- **ID shortcut:** a query that exactly matches a registry ID puts "Go to DQ-9" first,
  resolved from the embedded registry. Pagefind tokenises `DQ-9` into `dq` and `9`, so a
  plain search returns noisy results.
- Under `astro dev` there is no index, and the modal says to run `pnpm build && pnpm
  preview`.

## 8. Migration and verification

### 8.1 Steps

1. Scaffold Astro, MDX, Pagefind, `@fontsource`, Vitest and `yaml` with pnpm.
2. Extract data with one-off scripts (not committed): stories and `.q` blocks from doc 01
   into `stories.yaml` and `questions.yaml`, merged with the register's
   status/owner/assumption/answer; `decision-log.md` split into `D-*.md`; and the §3.3
   changes to the JSON.
3. Convert the prose to MDX section by section: escape the five `{variable}` literals, turn
   HTML comments into `{/* */}`, self-close void tags, and replace hand-written counts that
   have a data source with `<Fact>`. The three SVGs in doc 02 become components under
   `components/diagrams/`.
4. Tables that have a full data source render from data: doc 01 stories and questions, and
   doc 03 "The 23 content types". Every other table stays in MDX, with IDs auto-linked.

### 8.2 Discrepancy rule

When data and document text disagree (known case: CT23's `purpose` is "formula in code" in
doc 03 and "authorable inputs" in the JSON), the migration **does not choose**. Each case goes
into `docs/superpowers/migration-discrepancies.md` with both texts. The owner decides, and
the chosen text is written into the data source before merge. The same applies when a
computed `<Fact>` differs from the number the original document had hard-coded.

### 8.3 Checks

- **Fidelity diff** (`scripts/verify-fidelity.ts`): extracts visible text per section from
  each original through `git show <base>:docs/…html` and from `dist/ideas/*/index.html`,
  normalises whitespace, and diffs. The target is no difference, and any remaining
  difference must be explained in the discrepancy file.
- **Anchor check** (`scripts/verify-anchors.ts`): every `a.idref[href]` and index link in
  `dist/` points to an anchor that exists.
- **Unit tests (Vitest):** `linkify` (boundaries, `DQ-1` vs `DQ-10`, unknown IDs, ranges,
  self-skip), `registry` (all families present, no duplicates, hrefs well-formed), the
  inventory parser, and `facts` (values match the data).
- **`astro check`** for types, and **`astro build`** for schema validation.
- **Visual:** Playwright screenshots of each idea in consult and presentation mode, light and
  dark, at 1440 px and 390 px.

### 8.4 Cleanup

- Delete `docs/01-…html`, `docs/02-…html`, `docs/03-…html`, `decisions/decision-log.md` and
  `decisions/open-questions.md`.
- Add `pnpm dev`, `pnpm build` (Astro plus Pagefind), `pnpm preview` and `pnpm test`, and
  keep the `make` targets.
- Update `README.md` and `CLAUDE.md`: structure, commands, how to add an idea, and the new
  single place to update when an answer arrives (`data/questions.yaml` or the JSON).

## 9. Out of scope (v1)

Filterable tables, a `CMS-NN` capability registry, `file://` support, hosting or
authentication, a curated slide deck separate from the documents, collaborative features, PDF
or print export, and self-contained HTML exports per document.
