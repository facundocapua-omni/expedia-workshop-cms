# EG CMS Pilot — Contentful

Working repository for Globant's response to the Expedia Group CMS pilot
(evaluation of Contentful against 46 capabilities, two use cases).

Owner: Facundo — DXP Technical Director, Martech Studio.

---

## Status

| Workstream | State | Blocked on |
| --- | --- | --- |
| Pilot scoping — requirements and questions | Drafted | 27 questions awaiting EG |
| UC1 — cross-channel proof points | Design complete | 10 design questions (DQ-1…DQ-10) |
| UC2 — partner web content model | Design complete | 10 open questions |
| Estimation | Not started | Blocking answers on Q1–Q6b |

Nothing here has been shared with the client. Treat every document as a
first version rather than a revision of anything earlier.

---

## What's here

```
docs/        The three deliverables (self-contained HTML, open in a browser)
model/       uc2-matrix.json — source of truth for the UC2 content model
exports/     Generated workbook. Do not edit by hand; rebuild from model/
scripts/     build_xlsx.py — turns model/uc2-matrix.json into the workbook
sources/     Client inputs. Read-only by convention
decisions/   Decision log and the consolidated question register
```

### Documents

| File | What it is |
| --- | --- |
| `docs/01-pilot-backlog.html` | 43 user stories, build-vs-configure split, 27 open questions, 7 internal contradictions found in the EG brief |
| `docs/02-uc1-solution-architecture.html` | UC1 design: content model, content reference, authoring and consumption flows, performance, failure handling, ownership, validation plan |
| `docs/03-uc2-content-model.html` | UC2 content model: 35 inventory components → 23 Contentful content types, with the modelling decisions and per-template mapping |

### Sources

| File | Provenance |
| --- | --- |
| `EG_CMS_Pilot_Use_Cases_Contentful_9_11_2026.docx` | Client brief, 11 Sep 2026 |
| `component-inventory.md` | Internal component analysis, 35 components, client approval pending |

---

## Rebuilding the workbook

The workbook is generated. Edit `model/uc2-matrix.json`, never the `.xlsx`.

```bash
make xlsx          # or:
python3 scripts/build_xlsx.py model/uc2-matrix.json -o exports/EG-UC2-content-model-matrix.xlsx
```

Requires `openpyxl`.

---

## Conventions

**Terminology.** The documents avoid language that reads as correcting
earlier work — no "rejected", no "reclassified". Components are *unified*,
*kept distinct*, or *structural*. Keep it that way; these go to the client.

**Question IDs.** `Q1–Q26` plus `Q6b` come from the pilot backlog.
`DQ-1–DQ-10` are UC1 design questions. UC2 questions live in the matrix
JSON. All of them are tracked in `decisions/open-questions.md` — update
that register when an answer arrives, then update the document it affects.

**Content type IDs.** `CT01–CT23` are the UC2 content types.
`C001–C035` are the source inventory components. Never renumber either;
the mapping between them is the client's traceability.

**Numbers that must agree across documents.** Story count, question
counts, and the UC2 sizing arithmetic appear in several places. When one
changes, grep for the old value before committing.

---

## Known cross-document dependencies

- **UC1 and UC2 are coupled.** Partner web consumes the same Content
  Resolution API, so UC2's content model needs a proof-point block it does
  not have yet. Not added — waiting on EG confirming partner web is in scope.
- **The UC1 resolver is one custom runtime component.** Globant builds,
  EG hosts, support undecided (DQ-9).
- **Grammatical agreement is deferred** out of the UC1 POC. Stated in the
  document; must be raised in the readout rather than left to be noticed.
