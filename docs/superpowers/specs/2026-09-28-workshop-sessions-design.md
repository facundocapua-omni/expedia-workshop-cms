# Workshop sessions — design

Date: 2026-09-28 · Branch: `feat/astro-site` · Status: approved in conversation, pending spec review

## 1. Goal

The site is organised by use case: a long UC1 document (15 sections), a UC2 document
(5 sections), `/decide` grouped by question group, and the registers. The EG – Contentful
onsite workshop (Wed Sept 30 – Fri Oct 2) runs by **session**, and its sessions cut across
that structure. The site is reorganised so that each session has one page with its topics,
the material for each topic, the questions and decisions to settle there, and its expected
outcomes. Presenters walk a session page top to bottom without switching between documents.

### What was agreed

- **Three sessions now**, from the agenda text pasted on 2026-09-28:
  1. *Cross-channel proof point delivery and the Content Resolution API*
  2. *NBA hand-off: variant metadata, payload and feedback loop*
  3. *Partner web display layer and front end architecture*

  *AEM migration approach* and *Solution overview, plan and target dates* come in a later
  work session, using the same structure.
- **Sessions own the content.** Material moves from UC1/UC2 into session pages. It is not
  copied or linked. Whole sections move where possible. UC1 §01 (independent position
  blocks), §03 (reference vs. dimensions), §12 (independent alternatives) and §15
  (independent risk rows) are split at block level. What no session uses stays in UC1/UC2
  as reference material.
- **Agenda text is literal.** Session titles, tracks, owners, topic bullets and expected
  outcomes are copied verbatim and checked against a source copy of the agenda.
- **Topics without material are discussion prompts.** They show the topic, "No prepared
  material — for discussion", and their questions. No new prose is written in this task.
- **The UC2 content model stays in UC2** (§02–§05), for the content-modelling session
  visible in the agenda screenshot. Session 3 takes only the front-end mapping paragraph
  and links to the rest.
- **`/decide` keeps its grouping** by question group. Only "Discussed in" changes.

### Assumptions

- The site has not been shared outside the team, so old deep links (`/ideas/uc1-…/#consumption`)
  can break without redirects.
- The session 3 owner is copied as written in the source: "ContenExceltful w/ Globant". It
  looks like a typo and is listed as an open item (§9).

### Success criteria

- Each session page shows its agenda bullets in order, each linked to its section, and every
  bullet, title, track, owner and outcome matches `sources/workshop-agenda.md` line for line.
- Every block of the original UC1/UC2 documents is accounted for exactly once, on whichever
  page it now lives. The only exceptions are the one retired sentence and the reworded
  cross-references, all recorded in the allowlist with a reason.
- `pnpm test`, `pnpm check`, `pnpm build` and `pnpm verify` pass.
- Presentation mode walks each session slide by slide. No horizontal overflow at 390px.

## 2. Content mapping

Origins are `<doc>:<section id>:<piece>`. Piece numbers count the direct children of the
original section body in document order, starting at 0 (for §15, table rows, with the head
as 0). The original `<h2>` is not a piece.

### 2.1 Session 1 — `proof-point-delivery` · short "Delivery"

| Topic id | Agenda bullet (literal) | Material (origin) | Settles | Decisions |
|---|---|---|---|---|
| `flow` | End to end flow: NBA decision, notification to the channel, channel retrieves the proof point by reference | `uc1:consumption:*` (whole section) | — | — |
| `resolution-layer` | The proposed resolution layer: what Contentful provides natively, what needs configuration, and what would be custom build | `uc1:position:4` (thin resolution service), `uc1:components:*`, `uc1:alternatives:1` (delivery API directly), `uc1:position:6` (grammatical agreement deferred), `uc1:risks:1` (grammar), `uc1:risks:4` (scope creep) | Q5 | D-04, D-06 |
| `ownership` | Ownership of any custom layer: who builds, hosts and supports it | `uc1:ownership:*`, `uc1:risks:6` (support ownership) | DQ-9, DQ-10 | D-09 |
| `sfmc` | How SFMC retrieves content at send time | link to `#flow` rows 5–6, `uc1:risks:2` (SFMC per-recipient call) | Q6, Q22, DQ-4 | — |
| `performance` | Performance at production volume, including the burst of requests after a large send | `uc1:performance:*` | DQ-1, DQ-2, DQ-3 | — |
| `failure` | Failure handling and fallback | `uc1:failure:*` | DQ-5, DQ-6 | D-08 |
| `surfaces` | Whether the same pattern serves partner web and VMC | `uc1:surfaces:*`, `uc1:risks:7` (UC2 coupling) | DQ-7, DQ-8 | D-07 |
| `reference-implementations` | Reference implementations of this pattern | *prompt* | — | — |

### 2.2 Session 2 — `nba-hand-off` · short "NBA hand-off"

| Topic id | Agenda bullet (literal) | Material (origin) | Settles | Decisions |
|---|---|---|---|---|
| `variant-metadata` | How NBA reads variant metadata to choose a proof point variant | `uc1:position:2` (NBA selects), `uc1:model:*`, `uc1:alternatives:3` (Contentful resolving), `uc1:risks:5` (NBA variant index) | Q2, Q17 | D-02 |
| `taxonomy` | Shared taxonomy between the CMS and NBA | `uc1:position:5` (tone vs. register), `uc1:ref:3`–`uc1:ref:9` (dimensions), `uc1:alternatives:0` (tone and channel as one dimension) | Q6b | D-05 |
| `payload` | Contents of the notification payload sent to channels | `uc1:ref:0`–`uc1:ref:2` (reference format), `uc1:position:1` (template), `uc1:position:3` (one reference), `uc1:alternatives:2` (entry per partner), `uc1:alternatives:4` (hashed ID) | Q1, Q3, Q16, Q20 | D-01, D-03 |
| `served-variant` | Reporting the served variant back to NBA, including fallbacks | *prompt*, see Session 1 `#flow` (interaction 9) | Q15 | — |

### 2.3 Session 3 — `partner-web-display-layer` · short "Partner web"

| Topic id | Agenda bullet (literal) | Material (origin) | Settles | Decisions |
|---|---|---|---|---|
| `front-end` | Front end approach: who builds, hosts and maintains it | *prompt* | Q8, Q10 | — |
| `rendering` | Rendering, caching and page performance | *prompt*, see Session 1 `#performance` (where the cache sits) | U1 | — |
| `preview` | Live preview and visual editing | *prompt* | — | — |
| `components` | Mapping content types to front end components and the design system, including the 2027 brand refresh | `uc2:summary:3` (front-end paragraph), link to UC2 content types | Q9, U2, U3, U4, U8 | — |
| `self-serve` | What Web Ops can change without engineering versus what needs a developer | *prompt* | U9 | — |
| `multi-site` | Running multiple partner sites from one instance | *prompt* | U5 | — |
| `requirements` | SEO, tracking, consent, accessibility and EG security requirements | *prompt* | U7, U10 | D-24 |

### 2.4 What stays as reference material

- **UC1** keeps its masthead, §04 authoring, §11 validation, §13 sizing, §14 open questions,
  §15 with rows 0 (head), 3 (AI actions) and 8 (translation route), and the footer.
  Sections are renumbered 01–05. A new one-line note at the top of `main` points to
  sessions 1 and 2. §01, §02, §03, §05–§10 and §12 leave the page.
- **UC2** keeps everything except `uc2:summary:3`. A new one-line note in §01 points to
  session 3.
- **Unplaced questions:** Q4, Q7, Q11–Q14, Q18, Q19, Q21, Q23–Q26, U6, U11. They stay on
  `/decide` and in the register. Most belong to *Solution overview* or *AEM migration*.

## 3. Data model

### 3.1 Agenda source (`sources/workshop-agenda.md`)

The pasted agenda text, verbatim, one line per title, track, owner, bullet and outcome. It
is read-only like the rest of `sources/`, and it is the reference for the literal check (§7).

### 3.2 Sessions (`src/content/sessions/<slug>.yaml`)

```yaml
title: Cross-channel proof point delivery and the Content Resolution API
short: Delivery
track: Cross-channel proof points
owner: Globant, Contentful and Salesforce
order: 1
outcomes:
  - Target delivery pattern agreed in principle
topics:
  - agenda: How SFMC retrieves content at send time
    id: sfmc
    nav: SFMC at send time
    settles: [Q6, Q22, DQ-4]
    decisions: []
  - agenda: Reference implementations of this pattern
    id: reference-implementations
    nav: Reference implementations
    prompt: true
```

Schema (`sessionSchema` in `src/lib/schemas.ts`): `title`, `short`, `track`, `owner`,
`order`, `outcomes` (non-empty strings), `topics` (non-empty). Each topic has `agenda`, `id`
(lower-case slug), `nav`, `settles` (question IDs, default `[]`), `decisions` (D-NN, default
`[]`), `prompt` (default `false`) and `see` (optional `{ href, label }`, rendered as "See also" after the material or the prompt line, so a prompt topic can point at material elsewhere). Session and topic objects are `.strict()`, like the
other schemas, so a misspelt key fails instead of being dropped.

### 3.3 Topic material (`src/content/topics/<session>/<topic>.mdx`)

One MDX file per non-prompt topic, holding the moved blocks, each wrapped with its
`data-origin`. No frontmatter is required. Glob ids are `<session>/<topic>`. The MDX gotchas
in CLAUDE.md apply unchanged. Figures still come from `src/content/fragments/*.html?raw`.

### 3.4 Site data

- `SiteData.sessions: SessionMeta[]`, sorted by `order`, with topics in agenda order and a
  `hasMaterial` flag per topic, resolved from the topics collection.
- `placementOf(id)` (in a new `src/lib/sessions.ts`) returns `{ session, topic }` for a placed
  question and `undefined` otherwise.
- `questions.yaml`: `idea` and `section` are removed from Q1, Q2, Q3, Q6b and DQ-1–DQ-10,
  which are now placed. `data.ts` injects `idea: uc2-content-model` only into U questions
  that are not placed (U6, U11).
- The registry is unchanged. Questions are still defined on `/registers/questions/`, and
  content types on UC2.

### 3.5 Validation (`findProblems`)

New rules:
- Every `settles` ID is a known question, and every `decisions` ID is a known decision.
- A question is settled in at most one topic.
- A placed question carries no `idea`/`section`, so there is only one place per fact.
- A non-prompt topic has a material file, a prompt topic has none, and every material file
  belongs to a declared topic.
- Topic ids are unique within a session, and session `order` and `short` are unique.

## 4. Session page (`src/pages/sessions/[slug].astro`)

Built on `Doc.astro` with `kind: 'session'`. `Doc` gains an optional `outcomes` list in
the masthead, and `lede` becomes optional. The idea mastheads are unchanged, so their
fidelity check still holds.

1. **Masthead** (first slide): kicker `Session N · <track>`, the title, meta `Owner: <owner>`,
   and "Expected outcomes" with the outcomes as a list.
2. **01 Agenda**: the bullets in order, each linking to `#<topic id>`. Prompt topics carry a
   "discussion" chip.
3. **One `Section` per topic** (`n` from 02), with the bullet as the title and `nav` as the
   index label. It renders the topic's material, or for a prompt the line
   "No prepared material — for discussion", followed by **To settle here**: the settled
   questions as `QuestionItem`s and the listed decisions as links. Both parts are omitted
   when empty.
4. **Last section, "Expected outcomes"** (closing slide): the outcomes again, then what is
   still open from the session, reusing `onAgenda` and `hasProposal`, split into
   *to confirm* and *to decide*.

`QuestionItem` receives a computed `discussedIn` (`{ href, label }`) instead of `ideaTitles`.
A new `discussedIn(q, data)` in `src/lib/sessions.ts` returns the session topic for a
placed question, and otherwise the idea/section as today. `/decide` and the question
register use it too.

## 5. Moving content and fidelity

### 5.1 Origin markers

Every moved or kept block from the original documents carries
`data-origin="<doc>:<section>:<piece>"`. For a whole section moved as one piece, a wrapper
`<div data-origin="uc1:consumption:*">` holds all of its children. For a split table, each
`<tr>` carries its own origin. A session table repeats the header row without an origin, so
the copy is not compared. Kept UC1/UC2 section blocks are marked the same way. The idea
mastheads (rendered by `Doc.astro`) and footers do not move, so they are still compared by
selector on their own page, as today.

New connective text (topic headings, notes, prompt lines, "To settle here") sits outside
any origin element and is not compared.

### 5.2 Checker (`scripts/verify-fidelity.mjs`)

Mastheads and footers are compared by selector, as today. For each original section:
1. Collect every element with a matching origin across all built pages (`dist/**/index.html`).
2. Expand `*` to the whole body. Otherwise order the pieces by number and concatenate their
   visible text (same `visibleText` as today).
3. Compare with the original body text (without `<h2>`), after applying the allowlist.
4. Fail on a missing piece, a duplicate piece, an origin that matches no original block, or
   a mismatch. The error reports the first differing character, as today.

`<pre>` blocks are compared byte for byte by origin. The doc 01 question-detail check is
unchanged.

### 5.3 Allowlist

Entries move from `page` to `origin`. There are two kinds:
- `{origin, from, to, reason}`: a reworded cross-reference.
- `{origin, retire: true, reason}`: a piece deliberately dropped.

The two existing entries are re-keyed. New entries:

| Origin | From → to | Reason |
|---|---|---|
| `uc1:position:0` | *retired* (the "Each of these answers one of the open questions…" note) | The six positions now sit with the topic each one answers |
| `uc1:position:1` | "See the deferred-scope note below" → link to session 1 `#resolution-layer` | The note moved to session 1 |
| `uc1:position:5` | "Section 03 sets the four dimensions out side by side" → "The table below sets…" | Same topic now |
| `uc1:components:*` | "the fallback behaviour of section 09" → link to `#failure` | Section numbers no longer exist |
| `uc1:ownership:*` | "the fallback behaviour above" and "the cache topology in section 08" → links to `#failure` and `#performance` | Topic order differs from section order |
| `uc1:risks:4` | "Section 10 names who builds…" → link to `#ownership` | Section numbers no longer exist |
| `uc1:open:*` | "the production concerns above", "section 08", "section 09" → links to session 1 | The concerns moved to session 1 |

The exact replacement wording is fixed in the implementation plan. Each reworded reference
becomes an `<a>`, so `verify-anchors` checks it.

## 6. Navigation, home, presentation, search

- **Top bar:** `Delivery · NBA hand-off · Partner web · UC1 · UC2 · Decide · Questions ·
  Decisions · Inventory`. Session links come from `SiteData.sessions`. Checked at 390px.
- **Home:** **Sessions** first, with one card per session (`Session N · track`, title, owner,
  "N topics · N to settle"). Then **Reference material** (UC1, UC2, formerly "Ideas"), then
  Decide and Registers as today.
- **Presentation:** no change to `present.ts`. Masthead, agenda, topics and closing section
  are all `[data-slide]`.
- **Search:** session pages are indexed through `main[data-pagefind-body]` with
  `kind:session`.

## 7. Tests and checks

- **vitest** (fixtures in `tests/fixtures.ts`):
  - `validate`: each new rule in §3.5, positive and negative.
  - `sessions`: `placementOf`, `discussedIn` (placed goes to the session topic, unplaced falls
    back to idea/section), and the "still open" split of the closing section.
  - `agenda-source`: every session's title, track, `Owner: <owner>`, bullets and outcomes
    appear as full lines in `sources/workshop-agenda.md`.
- **`pnpm verify`**: `verify-anchors` (unchanged, now covers session links) and the new
  origin-based `verify-fidelity`. Include one negative run with a deliberately altered piece
  to confirm it fails.
- **Visual:** each session page at 1440px and 390px, and presentation mode on session 1.

## 8. Documentation

CLAUDE.md gains the sessions and topics collections, the `data-origin` contract with the
origin-keyed allowlist, and "adding a session" (agenda source lines, session YAML, one MDX
per topic with material).

## 9. Open items

- Session 3 owner spelling ("ContenExceltful"). Confirm before the workshop. It is changed
  in the session YAML and the agenda source together.
- The pasted agenda has no time slots. If they are wanted on the masthead, add `time` to the
  session schema and the source.

## 10. Out of scope

The AEM migration and Solution overview sessions, the content-modelling session, new prose
for prompt topics, moving the UC2 content model, redirects for old anchors, and any change
to the workbook.
