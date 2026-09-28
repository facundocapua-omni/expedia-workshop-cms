# Open question register

Every question across the three documents, in one place. Full text and
reasoning live in the document named in the Source column; this is the
tracker.

**47 open.** Update Status here when an answer lands, then update the
document it affects.

Status values: `open` · `assumed` (we are proceeding on a stated
assumption) · `answered` · `closed` (no longer relevant).

---

## Blocking — settle before estimating

| ID | Question | Owner | Status | Source |
| --- | --- | --- | --- | --- |
| Q1 | Where does the personalised value live — stored per partner, or injected at render time? | EG architecture | answered | 01 |
| Q2 | Who resolves the variant, NBA or Contentful? | EG | answered | 01 |
| Q3 | One content ID across channels, or one per channel rendering? | EG | answered | 01 |
| Q4 | What mechanism produces the channel-specific rendering automatically? | EG | open | 01 |
| Q5 | Where is the localised sentence assembled? | EG | assumed | 01 |
| Q6 | How does SFMC fetch at send time? | EG marketing ops | open | 01 |
| Q6b | Is tone a property of the partner or of the channel? | EG | open | 01 |

Q1, Q2 and Q3 are answered by the UC1 design positions. They remain
listed because EG has not confirmed them.

## Scope boundaries

| ID | Question | Owner | Status | Source |
| --- | --- | --- | --- | --- |
| Q7 | Are UC1 and UC2 one pilot or two tracks? | EG | open | 01 |
| Q8 | Who builds the rendering front end for UC2? | EG + Globant | answered | 01 |
| Q9 | Does the component library exist, or must it be built? | EG | open | 01 |
| Q10 | Where are the three pilot pages published? | EG | open | 01 |
| Q11 | What is the current-state CMS, and is coexistence in scope? | EG | open | 01 |
| Q12 | Are CMS-22, CMS-23 and CMS-24 in the pilot? | EG | open | 01 |
| Q13 | Is CMS-27 intentionally excluded from the capability list? | EG | open | 01 |
| Q14 | What counts as evidence when nothing is rendered? | EG | open | 01 |
| Q15 | Who builds the feedback loop (CMS-39/40/41)? | EG | open | 01 |

Q8 is answered: a Next.js and Tailwind front end is in scope for UC2.

## Inputs and dependencies

| ID | Question | Owner | Status | Source |
| --- | --- | --- | --- | --- |
| Q16 | Travel Corridors payload spec and sample | EG / NBA | open | 01 |
| Q17 | How many variants, and how many channel renderings per variant? | EG content | open | 01 |
| Q18 | Why do the UC1 and UC2 locale sets differ? | EG | open | 01 |
| Q19 | Contentful, Babel Prime, or both — and who builds the connector? | EG | open | 01 |
| Q20 | Who owns the data contract, and by when? | EG | open | 01 |
| Q21 | Which EG people are available, and for how long? | EG | open | 01 |
| Q22 | Is the SFMC future-state environment ready in the pilot window? | EG | open | 01 |

## Commercial and evaluation

| ID | Question | Owner | Status | Source |
| --- | --- | --- | --- | --- |
| Q23 | Which Contentful tier and add-ons are assumed? | EG procurement | open | 01 |
| Q24 | Is this a comparative evaluation against other vendors? | EG | open | 01 |
| Q25 | What is the timeline and the definition of done? | EG | open | 01 |
| Q26 | How is a demo-only capability weighted against a built one? | EG | open | 01 |

---

## UC1 design questions

| ID | Question | Working assumption | Status | Source |
| --- | --- | --- | --- | --- |
| DQ-1 | Send size and window for a large send | none — estimates are order-of-magnitude | open | 02 |
| DQ-2 | Engagement rate and peak concurrency after a send | 10–20% engagement modelled | open | 02 |
| DQ-3 | Latency SLO for render and for the send-time call | p99 under 100ms from the resolver | open | 02 |
| DQ-4 | Is send-time fetch a production requirement? | yes | assumed | 02 |
| DQ-5 | Confirm fail-open for email and web, fail-closed for CRM | as specified | assumed | 02 |
| DQ-6 | How long may the service serve stale content? | indefinitely, with alerting | assumed | 02 |
| DQ-7 | Is partner web authenticated? | yes | assumed | 02 |
| DQ-8 | Decision lookup or precomputed decisions for pull surfaces? | precomputed | open | 02 |
| DQ-9 | Who operates and supports the Content Resolution API? | undecided | open | 02 |
| DQ-10 | Where is the service hosted, and is it internet-facing? | EG infra, internal-only | assumed | 02 |

---

## UC2 content model questions

| # | Question | Owner | Status | Source |
| --- | --- | --- | --- | --- |
| U1 | Is the recommended-for-you grid author-picked or query-driven? | EG content | open | 03 |
| U2 | Lead capture form — endpoint, fields, progressive disclosure, consent | EG marketing ops | open | 03 |
| U3 | Is the calculator formula authorable or in the front end? | EG product | open | 03 |
| U4 | Comparison table on mobile — scroll or stack? | EG design | open | 03 |
| U5 | Are URL slugs localised per locale? | EG SEO | open | 03 |
| U6 | Does any locale need different imagery? | EG brand | open | 03 |
| U7 | Does OneTrust remain an external script? | EG legal | open | 03 |
| U8 | Header mobile menu third level — is depth 3 correct? | EG | open | 03 |
| U9 | Which roles may place which blocks on which template? | EG content ops | open | 03 |
| U10 | What data layer does each block emit? | EG analytics | open | 03 |

---

## Answered — kept for the record

| ID | Question | Answer |
| --- | --- | --- |
| Q1 | Where does the personalised value live? | Template with named variables in Contentful; value injected at resolution time |
| Q2 | Who resolves the variant? | NBA selects from a variant index; Contentful never decides |
| Q3 | One content ID or one per channel? | One reference; channel is a fetch parameter |
| Q8 | Who builds the UC2 front end? | Globant, Next.js and Tailwind, in scope for the user story |
