# Migration discrepancies

Places where the migration found two versions of the same fact, or had to fill a gap. The
migration applied the **default** shown for each one so the site builds; the owner confirms or
changes each before merge. Resolve an item by editing the source named, then tick it.

## 1. CT23 purpose — conflicting statements

- [x] Resolved 2026-09-28 — formula in the front end. `components[CT23].purpose` now reads "Interactive value calculator; the formula lives in the front end, the input labels and copy are authored in the CMS"; workbook regenerated.

- Doc 03 (now `components[CT23].summary`, shown on the site): "Interactive calculator; formula in code, copy in the CMS"
- Matrix JSON (`components[CT23].purpose`, shown in the workbook): "Interactive value calculator with authorable inputs and copy"

The two disagree on whether the formula is authorable. U3 carries the same question.
**Default:** both kept as they are, which leaves the contradiction in place.

## 2. Doc 02 refers to "the backlog", which is no longer on the site

- [x] Resolved 2026-09-28 — both sentences reworded as proposed; recorded in `scripts/fidelity-allowlist.json`.

1. "Variants are modelled as referenced entries rather than a variant dimension, because core entries have no such dimension — this is the hand-modelled route described in the backlog, and it is deliberate here rather than a fallback."
2. "Phase C — the translation approval gate This is where the platform constraint from the backlog bites: publishing acts on the entry, so every locale goes live together, and a per-locale approval gate appears impossible."

**Default:** text kept verbatim. Proposed rewording: drop the reference ("…this is the
hand-modelled route, and it is deliberate here rather than a fallback" / "This is where a
platform constraint bites: …"). An accepted change goes into
`scripts/fidelity-allowlist.json` with its reason.

## 3. Q8 — has EG confirmed the answer?

- [x] Resolved 2026-09-28 — Globant builds it and EG has accepted it: `confirmedByEG: true`, so Q8 leaves the agenda.

The register lists Q8 as answered ("Globant, Next.js and Tailwind, in scope for the user
story"), but never says whether EG confirmed it. **Default:** `confirmedByEG: false`, which
keeps Q8 on the agenda.

## 4. Q5 — position was not written down anywhere

- [x] Resolved 2026-09-28 — proposed position accepted.

The register marks Q5 as `assumed` without stating the assumption. **Default position**,
inferred from D-04 and D-06: "The Content Resolution API assembles it: plain substitution of the parameters into the localised message pattern (D-04, D-06)."

## 5. U3 — position taken from doc 03

- [x] Resolved 2026-09-28 — position accepted.

**Default position:** "Formula in the front end, copy in the CMS: the formula is selected by calculatorKey, and the labels and disclaimer are authored."

## 6. DQ-1 and DQ-9 — working assumption treated as "no position"

- [x] Resolved 2026-09-28 — both stay under "to decide".

Their working assumptions ("none — estimates are order-of-magnitude", "undecided") are not
positions, so both sit under "to decide" on the agenda. The doc 02 table still shows the
text.

## 7. Question wording — doc 01 and the register differ

- [x] Resolved 2026-09-28 — doc 01 wording kept.

**Default:** doc 01's wording, the version written for the client.

| ID | Doc 01 (used) | Register |
| --- | --- | --- |
| Q1 | Where does the personalised value actually live? | Where does the personalised value live — stored per partner, or injected at render time? |
| Q2 | Who resolves the variant — NBA or Contentful? | Who resolves the variant, NBA or Contentful? |
| Q8 | Who builds the rendering layer for UC2? | Who builds the rendering front end for UC2? |
| Q9 | Does the component library already exist, or does it have to be built? | Does the component library exist, or must it be built? |
| Q13 | Is CMS-27 intentionally excluded? | Is CMS-27 intentionally excluded from the capability list? |
| Q15 | Who builds the feedback loop? | Who builds the feedback loop (CMS-39/40/41)? |
| Q16 | Can we have the Travel Corridors payload spec and a sample? | Travel Corridors payload spec and sample |
| Q17 | How many variants, exactly? | How many variants, and how many channel renderings per variant? |
| Q18 | Why do the two locale sets differ? | Why do the UC1 and UC2 locale sets differ? |
| Q22 | Is the SFMC future-state environment ready within the pilot window? | Is the SFMC future-state environment ready in the pilot window? |
| Q24 | Is this a comparative evaluation against other CMS vendors? | Is this a comparative evaluation against other vendors? |

## 8. Anchor renamed (for information)

- [x] Acknowledged 2026-09-28

Doc 02's section id `rejected` becomes `alternatives`, because URL fragments are visible and
the terminology rule applies. The title "Alternatives considered" does not change.
