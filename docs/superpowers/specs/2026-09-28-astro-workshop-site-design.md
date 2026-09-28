# Astro workshop site — design

Date: 2026-09-28 · Branch: `feat/astro-site` · Status: approved (rev. 2), amended by §0 (rev. 3)

## 0. Implementation findings (rev. 3)

These findings came from probing Astro 7.3.5 with the real documents before planning. Where
they conflict with a later section, they take precedence. Behaviour visible to the workshop
is unchanged.

1. **ID linking is a post-render HTML pass, not a rehype plugin** (supersedes §4.1's loader
   paragraph and §4.3). Astro 7 renders Markdown and MDX with its native processor
   (Sätteri), which does not run rehype plugins unless the whole pipeline is switched back
   to unified. `src/middleware.ts` runs `enhanceHtml` over every rendered page instead. It
   was verified to run during static prerendering and under `astro dev`. It produces the
   markup and skip rules of §4.3, with one call site instead of two, so there is no
   `<Linked>` or `IdLink` component and no `lib/sources.ts`. The registry comes from content
   collections through `loadSiteData()`.
2. **The page index is built by the same pass**, from `section[data-slide]`. `render()`
   only reports Markdown headings, not `Section` titles. A section may carry a shorter
   `nav` label: the original indexes use shorter labels than the headings.
3. **`<pre>` and SVG blocks are raw HTML fragments** (`src/content/fragments/*.html`,
   imported with `?raw`, rendered with `<Fragment set:html>`). MDX collapses whitespace in
   raw `<pre>`, and both MDX and `.astro` read `{}` as expressions. Every other brace is
   escaped, and HTML comments are dropped, because MDX rejects them. Probe result: all 20
   UC1/UC2 sections kept identical text, and both `<pre>` blocks were byte-identical.
4. **`markdown.smartypants: false`.** Otherwise straight quotes become typographic, which
   the fidelity check caught.
5. **Content types gain `summary`** (§3.3, §9.1 step 4). Doc 03's purpose column is a
   short editorial summary that differs from the JSON `purpose` in 21 of 23 rows, and in
   20 of those it doesn't contradict it. The site renders `summary` and the workbook keeps
   `purpose`. Only CT23 is a real conflict (§9.2).
6. **Questions keep doc 01's `why` note** as a field, next to `detail`. Q1, Q2, Q3 and Q6b
   point to UC1 §position, and DQ-* to UC1 §open, through a `section` field. Wording
   defaults to doc 01, the client-facing text. The register's differing wording for 11
   questions goes into the discrepancy file.
7. **One layout, `Doc.astro`** (renames `Idea.astro`), used by ideas, `/decide` and the
   registers. The Present button sits in the top bar, so the masthead stays identical to the
   original for the fidelity check. Styles are four global files (`tokens`, `prose`, `site`,
   `present`) instead of per-component CSS: the source documents share one stylesheet.
8. **Frontmatter and `Section` titles take `{{factKey}}` tokens**, because components can't
   live in YAML. Ideas gain a `short` label for the top bar.
9. **Presentation type scale** is `html { font-size: 125% }`, with every CSS font size in rem.
10. **Doc 02's section id `rejected` becomes `alternatives`**: URL fragments are visible, and
    the terminology rule applies. The heading text is unchanged.
11. **Verify scripts are plain Node `.mjs`**, and `verify-fidelity` also checks `<pre>`
    blocks byte for byte.

## 1. Goal

Replace the hand-written HTML deliverables with one Astro site for a joint Expedia Group (EG)
/ Contentful (CF) / Globant (GL) workshop. The workshop has two jobs: **present ideas** and
**take decisions**. The site stays usable as a reference before and after it.

**Backlog work is out of scope.** It is too early to shape a backlog, so the pilot backlog
document (`docs/01-pilot-backlog.html`) is dropped entirely. Only its open questions survive,
as decisions pending with EG.

### What was agreed

- **Astro replaces the HTML deliverables.** UC1 and UC2 content moves into the Astro project.
  All three `docs/*.html` files are deleted (git history keeps them).
- **Dropped from doc 01:** the 43 user stories (`US-*`), the build-versus-configure split, the
  evidence track, the seven contradictions in the brief, and "What I'd do next".
- **Kept from doc 01:** questions Q1–Q26 and Q6b, including their long-form reasoning, in the
  question data (§3.2).
- **One content, two views.** *Consult mode* is the long-form document. *Presentation mode*
  (key `P`) shows one numbered section per screen.
- **Ideas are extensible.** Today: UC1 solution architecture and UC2 content model. Adding an
  idea means adding one MDX file.
- **A decision agenda** (`/decide`) lists what the workshop needs to settle, generated from
  the question data (§5).
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

1. No visible text from the UC1 and UC2 documents is lost. The fidelity diff (§9.3) is empty,
   or every remaining difference is explained and approved.
2. The `detail` of every Q question matches its reasoning block in doc 01.
3. Every number that has a data source is computed from it.
4. Adding an idea means creating one MDX file with no other code changes.
5. Every linked ID resolves to an existing anchor, and the build fails otherwise.
6. Recording a decision after the workshop takes one data edit, and the agenda and registers
   update on the next build.

## 2. Architecture

Astro (latest) with MDX, static output, pnpm. Client-side JavaScript is limited to three small
vanilla scripts: presentation mode, ID tooltips and the search modal. There is no UI
framework.

```
src/
  content/ideas/            uc1-solution-architecture.mdx · uc2-content-model.mdx
  components/               Section, Question, QuestionList, Chip, Fact, Linked, IdLink,
                            ContentTypeTable, diagrams/*
  layouts/                  Base.astro (tokens, theme, top bar) · Idea.astro (masthead, index, sections)
  lib/                      sources.ts (fs loaders) · registry.ts · linkify.ts · facts.ts
                            · agenda.ts · inventory.ts (markdown table parser) · rehype-idrefs.ts
  scripts/                  present.ts · tooltips.ts · search.ts
  styles/                   tokens.css · prose.css
  pages/                    index.astro · ideas/[slug].astro · decide.astro
                            · registers/{questions,decisions,inventory}.astro
  content.config.ts         collections + zod schemas
data/
  questions.yaml            Q1–Q26, Q6b, DQ-1–DQ-10
decisions/                  D-01.md … D-25.md (one per decision)
model/uc2-matrix.json       unchanged except the open_questions additions in §3.3
sources/                    untouched
tests/                      Vitest unit tests + scripts/verify-* build checks
```

Routes: `/`, `/ideas/<slug>/`, `/decide/`, `/registers/questions/`, `/registers/decisions/`,
`/registers/inventory/`. Search is a modal, not a route. Idea slugs drop the numeric prefix;
order comes from frontmatter.

## 3. Data model

Rule: **every fact is defined in exactly one place.** Pages render from that place.

### 3.1 Ideas (`src/content/ideas/*.mdx`)

Frontmatter: `title`, `kicker`, `lede`, `order` (number), `meta` (list of short strings;
items may contain `<Fact>`). The body is a sequence of `<Section n="03" id="ref" title="…">`
blocks. The masthead is slide 0, and each `Section` is one slide.

### 3.2 Questions (`data/questions.yaml`)

One record per EG question or UC1 design question:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `Q1`…`Q26`, `Q6b`, `DQ-1`…`DQ-10` |
| `group` | enum | `blocking`, `scope`, `inputs`, `commercial`, `uc1-design` (the register's headings) |
| `question` | string | short form, from the register |
| `detail` | string, optional | long reasoning, extracted from doc 01's `.qb` blocks before deletion |
| `owner` | string, optional | |
| `status` | enum | `open`, `assumed`, `answered`, `closed` |
| `position` | string, optional | GL's proposed answer: the DQ working assumption, or the design position for `assumed` and `answered` items |
| `answer` | string, optional | from "Answered — kept for the record" |
| `confirmedByEG` | bool | default `false`. `true` only once EG has accepted the answer |
| `idea` | slug, optional | where the question is discussed. Q1, Q2, Q3 and Q6b point to `uc1-solution-architecture`, and every DQ does too |

`status` records whether an answer exists. `confirmedByEG` records whether the client has
accepted it. Q1–Q3 are `answered` by the UC1 design positions but not confirmed, as the
register states. Q8's confirmation state is not stated anywhere, so it starts as `false` and
goes into the discrepancy file (§9.2) for the owner to settle.

### 3.3 UC2 questions (`model/uc2-matrix.json → open_questions`)

UC2 questions stay in the JSON because they feed the workbook. Each entry gains `id`,
`status`, `confirmedByEG` and optionally `position`, and its `idea` is implicitly
`uc2-content-model`. The register and the JSON currently disagree, and this is resolved as
agreed on 2026-09-28 by taking the union and keeping the register's IDs:

| ID | Question (short) | Origin |
| --- | --- | --- |
| U1 | Recommended-for-you grid: author-picked or query-driven | JSON #1 |
| U2 | Lead capture form: endpoint, fields, consent | JSON #2 |
| U3 | Calculator formula authorable or in the front end | **register only.** Added to the JSON as `assumed`, with `position` taken from doc 03 (formula in the front end, copy in the CMS) |
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
new keys, and that the only workbook change is the added row and the open-questions count.

### 3.4 Decisions (`decisions/D-NN.md`)

Frontmatter: `id`, `title`, `useCase` (`uc1` or `uc2`), and optionally `resolves` (list of
question IDs). The body is the existing prose (*Why*, *Consequence*, *Reopens if*, *Cost*,
*Open*). The log stays append-only: a new decision means a new file, and past files are never
rewritten.

### 3.5 Inventory

`lib/inventory.ts` parses the "Approved components (internal)" table in
`sources/component-inventory.md` at build time, so the source file is never copied or
edited. The C→CT mapping is derived from `components[].consolidates` in the JSON (entries
starting with a `C0NN` ID).

### 3.6 Facts (`lib/facts.ts`)

Named counts computed from the data, used as `<Fact k="…"/>` in MDX and frontmatter:
`egQuestions`, `designQuestions`, `uc2Questions`, `questionsTotal`, `questionsByStatus.*`,
`agendaToConfirm`, `agendaToDecide`, `contentTypes`, `inventoryComponents`, `decisions`.
Numbers without a data source ("46 capabilities", sizing arithmetic, `CMS-47`, example
values such as `"views": 47`) stay as text.

### 3.7 Validation

Zod schemas in `content.config.ts` fail the build on a duplicate ID, an unknown enum value, an
`idea` slug that doesn't exist, a `resolves` entry that isn't a known question ID, or an
`assumed` question without a `position`. That last rule keeps an assumed item from falling
into the agenda's "to decide" block. If extraction finds no position for an assumed item
(Q5 is the likely case), the item goes into the discrepancy file. `make check` stays as it
is.

## 4. ID registry and linking

### 4.1 Registry (`lib/registry.ts`)

`Map<id, { kind, label, status?, href }>`, built from the §3 sources:

| Family | Source | `href` |
| --- | --- | --- |
| `Q*`, `DQ-*` | `data/questions.yaml` | `/registers/questions/#dq-9` |
| `U*` | JSON `open_questions` | `/registers/questions/#u3` |
| `D-*` | `decisions/*.md` | `/registers/decisions/#d-05` |
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

Each page embeds the registry once as JSON (about 120 entries, about 13 KB).
`scripts/tooltips.ts` shows a popover on hover and on keyboard focus with the ID, the short
label and a status chip. Without JavaScript the link still works.

## 5. Decision agenda (`/decide`)

`/decide` is a view of the question data. It adds no content of its own.

- **What it includes (`lib/agenda.ts`):** every question that is `open` or `assumed`, plus
  every `answered` question with `confirmedByEG: false`. Questions that are `closed`, or
  `answered` and confirmed, drop out.
- **How it's grouped:** one `Section` per group, in the register's order: blocking, scope,
  inputs, commercial, UC1 design, UC2 content model. Empty groups are omitted. Within each
  group there are two blocks:
  - **To confirm:** the item has a `position` or an `answer`, so the discussion is yes or no.
  - **To decide:** the item has no position yet, and EG needs to answer it.
- **Each item** shows the ID as an idref to the register, the question, the `detail` as
  context, the owner, the proposed position if there is one, and a link to the `idea` section
  where it is discussed. Agenda items are not definition sites.
- **Masthead:** `<Fact k="agendaToConfirm"/>` to confirm and `<Fact k="agendaToDecide"/>` to
  decide, in total and per group.
- **In presentation mode** each group is one slide.
- **After the workshop:** update `status`, `confirmedByEG` and `answer` in the data, and add a
  `decisions/D-NN.md` with `resolves: [Q…]` for every decision taken. On the next build the
  agenda shrinks, and the registers show the outcome. This procedure is written into
  `README.md` and `CLAUDE.md`.

The questions register at `/registers/questions/` keeps every question, including the settled
ones, and it is where each ID is defined for linking. The agenda's IDs therefore link to the
register, which is what makes the tooltip and the full record reachable from a slide.

## 6. Layout

- `styles/tokens.css` merges the documents' tokens (`--paper --card --ink --ink-soft --rule
  --rule-soft --accent --flag --ok --warm` plus `-soft`), with dark mode through
  `prefers-color-scheme` and the existing `data-theme` override.
- Fonts are self-hosted through `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono`,
  so the workshop doesn't depend on network access.
- `Idea.astro` renders the masthead from frontmatter and the sticky index from the
  `Section` headings. The index is generated, never hand-written. `/decide` uses the same
  layout.
- Home lists ideas by `order`, gives the decision agenda a prominent link with its counts,
  and links to the three registers and to search. The top bar has home, ideas, decide,
  registers and search.
- Component-specific CSS (question, trap, figure, pill) lives with its component. Shared
  prose styles live in `prose.css`, which ends today's per-document copies.
- Layouts must work at 390 px with no horizontal page scroll. Wide tables scroll inside their
  own container, as they do today.

## 7. Presentation mode (`scripts/present.ts`)

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

## 8. Search

- Pagefind indexes `dist/` after `astro build`. Only `data-pagefind-body` content is indexed
  (not the nav or the tooltip JSON), and a `data-pagefind-filter` of `idea`, `agenda` or
  `register` distinguishes the kinds of result.
- The modal opens with `/` or from the top bar.
- **ID shortcut:** a query that exactly matches a registry ID puts "Go to DQ-9" first,
  resolved from the embedded registry. Pagefind tokenises `DQ-9` into `dq` and `9`, so a
  plain search returns noisy results.
- Under `astro dev` there is no index, and the modal says to run `pnpm build && pnpm
  preview`.

## 9. Migration and verification

### 9.1 Steps

1. Scaffold Astro, MDX, Pagefind, `@fontsource`, Vitest and `yaml` with pnpm.
2. Extract data with one-off scripts (not committed):
   - The Q1–Q26/Q6b `.q` blocks from doc 01 become `detail`, merged with the register's
     status, owner, assumption and answer into `questions.yaml`.
   - `decision-log.md` is split into `D-*.md`.
   - The §3.3 changes are applied to the JSON.
   - Nothing else is extracted from doc 01.
3. Convert the UC1 and UC2 prose to MDX section by section: escape the five `{variable}`
   literals, turn HTML comments into `{/* */}`, self-close void tags, and replace hand-written
   counts that have a data source with `<Fact>`. The three SVGs in doc 02 become components
   under `components/diagrams/`.
4. Doc 03 "The 23 content types" renders from the JSON. Every other table stays in MDX, with
   IDs auto-linked.

### 9.2 Discrepancy rule

When data and document text disagree, the migration **does not choose**. Each case goes into
`docs/superpowers/migration-discrepancies.md` with both texts and, where useful, a proposed
wording. The owner decides, and the chosen text is written into the source before merge. The
same applies when a computed `<Fact>` differs from the number the original document had
hard-coded. Known cases:

- CT23's `purpose` is "formula in code, copy in the CMS" in doc 03 but "authorable inputs and
  copy" in the JSON.
- Doc 02 refers to "the backlog" twice (in the content model section note and in the authoring
  flow), and the backlog no longer exists on the site.
- Q8's `confirmedByEG` state is not recorded anywhere.

### 9.3 Checks

- **Fidelity diff** (`scripts/verify-fidelity.ts`): extracts visible text per section from
  docs 02 and 03 through `git show <base>:docs/…html` and from `dist/ideas/*/index.html`,
  normalises whitespace, and diffs. The target is no difference, and any remaining difference
  must be explained in the discrepancy file. For Q questions, the same script checks each
  `detail` against its `.qb` block in doc 01.
- **Anchor check** (`scripts/verify-anchors.ts`): every `a.idref[href]` and index link in
  `dist/` points to an anchor that exists.
- **Unit tests (Vitest):** `linkify` (boundaries, `DQ-1` vs `DQ-10`, unknown IDs, ranges,
  self-skip), `registry` (all families present, no duplicates, hrefs well-formed), `agenda`
  (inclusion rule, confirm/decide split, group order, confirmed items drop out), the inventory
  parser, and `facts` (values match the data).
- **`astro check`** for types, and **`astro build`** for schema validation.
- **Visual:** Playwright screenshots of both ideas and `/decide` in consult and presentation
  mode, light and dark, at 1440 px and 390 px.

### 9.4 Cleanup

- Delete `docs/01-pilot-backlog.html`, `docs/02-uc1-solution-architecture.html`,
  `docs/03-uc2-content-model.html`, `decisions/decision-log.md` and
  `decisions/open-questions.md`.
- Add `pnpm dev`, `pnpm build` (Astro plus Pagefind), `pnpm preview` and `pnpm test`, and
  keep the `make` targets.
- Update `README.md` and `CLAUDE.md`. Remove the backlog workstream and the story counts, and
  add the structure, the commands, how to add an idea, and how to record a workshop decision
  (§5).

## 10. Out of scope (v1)

Anything backlog-related (user stories, build versus configure, estimation), filterable
tables, a `CMS-NN` capability registry, live decision capture in the browser, `file://`
support, hosting or authentication, a curated slide deck separate from the documents,
collaborative features, PDF or print export, and self-contained HTML exports per document.
