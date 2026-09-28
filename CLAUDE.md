# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Globant's (GL) workspace for the Expedia Group (EG) CMS pilot on Contentful (CF): a static Astro
site used at an EG / CF / GL workshop to **present ideas and take decisions**, organised by
workshop session. Backlog shaping
is deliberately out of scope. Content and UI are in English, because they go in front of the client.

## Commands

```bash
pnpm dev              # dev server; without a TTY it detaches — stop with `pnpm astro dev stop`
pnpm build            # astro build + pagefind --site dist + verify-anchors (a broken internal link fails the build)
pnpm preview          # serve dist/ (search only works on the built site); also detaches — `pnpm astro preview stop`
pnpm test             # vitest; one file: pnpm test tests/linkify.test.ts; one test: add -t "<name>"
pnpm check            # astro check (types)
pnpm verify           # after build: verify-anchors + verify-fidelity + verify-terms (client-facing wording)
make xlsx | make check   # regenerate / sanity-check the UC2 workbook from model/uc2-matrix.json
```

## Architecture

- **Data, one place per fact.** `src/content.config.ts` loads every collection: sessions
  (`src/content/sessions/<slug>.yaml`, inline loader), topic material
  (`src/content/topics/<session>/<topic>.mdx`), ideas (MDX), decisions (`decisions/D-NN.md`), questions (`data/questions.yaml`), UC2 questions,
  content types and consolidation (parts of `model/uc2-matrix.json`), and the inventory
  (parsed from `sources/component-inventory.md` by `src/lib/inventory.ts`). Schemas are in
  `src/lib/schemas.ts`.
- **`loadSiteData()`** (`src/lib/data.ts`) is the only way pages read data. It joins the
  collections, sorts by `compareIds`, and runs `assertValid` for the cross-collection rules
  zod can't express. Pure derivations on top of it: `buildRegistry` (ID → label, status,
  href), `computeFacts` (counts), `buildAgenda` (the `/decide` view).
- **Sessions.** `/sessions/<slug>/` walks the session's `topics` in agenda order. For each topic it
  renders the topic's MDX (or the discussion prompt when `prompt: true`), the optional `see`
  link, and then, under "To settle here", the questions in `settles` and the decisions in
  `decisions`. The last section lists the expected outcomes and what `stillOpen`
  (`src/lib/sessions.ts`) leaves on the agenda. A question is settled in one topic at most, and
  a settled question carries no `idea`/`section`. "Discussed in" comes from `discussedIn()`.
  UC1 and UC2 (`src/content/ideas/`) keep only the material no session uses yet.
- **ID linking and page index happen after rendering**, in `src/middleware.ts` →
  `enhanceHtml` (`src/lib/enhance.ts`). It runs in dev and during static prerendering. Astro 7
  renders Markdown with its native processor, which does not run rehype plugins, so do not
  add a rehype plugin for this. Contract: a definition site carries
  `id="<lower-cased ID>" data-def="<ID>"`; slides are `[data-slide]`; sections carry
  `data-n`, `data-title` and optionally `data-nav`; `nav[data-index]` is filled
  automatically.
- **Layouts.** `Base.astro` holds the top bar, the registry JSON (`script#idref-data`) and
  the three client scripts (`src/scripts/{tooltips,present,search}.ts`). `Doc.astro` holds
  the masthead (with a session's outcomes), index and `main[data-pagefind-body]`, and is used by
  sessions, ideas, `/decide` and the registers.
- **Numbers from data** are `<Fact k="…"/>` in MDX bodies, and `{{key}}` in frontmatter and
  `Section` titles (`interpolateFacts`). Unknown keys fail the build.

## Gotchas

- MDX: escape literal `{`/`}` as `\{`/`\}`, never write HTML comments, and put `<pre>` or
  SVG blocks in `src/content/fragments/*.html`, imported with `?raw` and rendered with
  `<Fragment set:html={…} />`. MDX collapses pre whitespace and reads braces as expressions.
- MDX drops the whitespace between sibling inline elements written on separate lines
  (`<span>A</span>` newline `<span>B</span>` reads as "AB" to search and screen readers). Keep
  such siblings on one line, separated by a space.
- `markdown.smartypants` is off on purpose (straight quotes, fidelity).
- `glob()` ids are lower-cased file names. Use `data.id` for decision IDs.
- Questions and the matrix use inline loaders on purpose: Astro's `file()` loader swallows parser
  errors and builds with the collection empty or stale. Keep them inline; under `astro dev`, data
  edits need a restart. `tests/build-errors.test.ts` builds a throwaway copy to prove bad data fails.
- Schemas are `.strict()`: a misspelt key fails the build instead of vanishing.
- TypeScript is pinned to 6.x because `@astrojs/check` does not accept 7.
- `scripts/verify-fidelity.mjs` rebuilds every original section (commit `6c8dd77`) from the
  `data-origin="<doc>:<section>:<piece|*>"` blocks on the built site, wherever they live. Moving a
  block keeps its origin. Splitting a section means marking each piece (`node
  scripts/verify-fidelity.mjs --pieces <doc>:<section>` lists them). A wording change or a
  retired piece needs an entry in `scripts/fidelity-allowlist.json`, keyed by origin.
- `verify-anchors` also fails on an id used twice on a page. A question appears once per page as
  a `QuestionItem`; the closing section of a session lists IDs as plain text on purpose.

## Conventions that matter

- **Client-facing terminology:** no "rejected", no "reclassified". Components are
  *unified*, *kept distinct*, or *structural*.
- **Stable IDs, never renumber:** `Q1–Q26`, `Q6b`, `DQ-1–DQ-10`, `U1–U11`, `D-NN`,
  `CT01–CT23`, `C001–C035`.
- **Recording a decision:** update the question's `status`, `answer` and `confirmedByEG`
  (`data/questions.yaml`, or the JSON for U*), then add a new `decisions/D-NN.md` with
  `resolves`. Never edit past decisions. UC1 numbers from D-10, UC2 from D-26.
- `exports/*.xlsx` is only regenerated (`make xlsx`); `sources/` is read-only, except that a new
  session's agenda text is appended to `sources/workshop-agenda.md`; the inventory's analyst
  notes are never published.

## Adding a session

1. Append the session's agenda text, as pasted, to `sources/workshop-agenda.md`.
2. Write `src/content/sessions/<slug>.yaml`, copying title, track, owner, bullets and outcomes
   literally (`tests/agenda-source.test.ts` checks them, in order).
3. Add one MDX per topic with material under `src/content/topics/<slug>/`, moving blocks with
   their `data-origin`. A topic with no material is `prompt: true` and has no file.
4. Take `idea`/`section` off the questions it settles.
5. Run `pnpm test && pnpm build && pnpm verify`.

Still to add: *AEM migration approach* and *Solution overview, plan and target dates*.

## Known couplings

- The session 3 owner is copied as written in the agenda ("ContenExceltful"). Confirm the
  spelling with the agenda owner before the workshop, and change it in the YAML and the source
  together.

- UC2 needs a proof-point block once EG confirms partner web is in scope (it consumes the UC1
  Content Resolution API).
- The UC1 resolver is the only custom runtime component. Support is undecided (DQ-9).
- Grammatical agreement is deferred (D-06) and must be raised at the workshop.
