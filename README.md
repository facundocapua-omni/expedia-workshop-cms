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
pnpm preview    # serves dist/; full-text search only works here (also detaches; `pnpm astro preview stop`)
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
