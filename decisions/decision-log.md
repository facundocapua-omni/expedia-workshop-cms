# Decision log

Decisions taken so far, why, and what would reopen each one. Append; do
not rewrite history. Full reasoning lives in the documents.

---

## UC1 — cross-channel proof points

### D-01 · Contentful stores the message template, never the partner's number
Entries hold copy with named variables (`{views}`, `{windowDays}`); the
value arrives with NBA's decision and is substituted at resolution time.

*Why:* keeps the content set at variant scale rather than partner scale.
The ~1M record figure in the brief describes partners, not content.

*Reopens if:* EG confirms they want per-partner content entities, which
would make this a data problem rather than a content one.

### D-02 · NBA selects the variant; Contentful never decides
NBA reads a variant index published out of Contentful and picks one.

*Why:* matches the stated pilot parameter, keeps personalisation
licensing off the critical path, makes the fetch deterministic and
cacheable.

*Consequence:* the variant index feed is a first-class deliverable. NBA
cannot choose between variants it has not been told about — this is not
in the brief's flow.

### D-03 · One content reference everywhere; channel is a parameter
All surfaces quote the same reference and pass their own channel.

*Why:* makes both contradictory statements in the brief true at once, and
gives the consistency test something machine-checkable (`consistencyKey`).

### D-04 · A thin Content Resolution API sits between Contentful and the channels
Stateless service: parses the reference, serves an immutable snapshot,
applies and reports locale fallback, substitutes variables, shapes the
channel payload.

*Why:* the delivery API serves only the latest published version, its
locale fallback is silent, and it will not absorb a post-send burst. The
consistency guarantee has to be enforced in one place.

*Cost:* one net-new runtime component to build, host and support. See D-09.

### D-05 · Tone belongs to the partner; register belongs to the surface
Tone is a selection criterion chosen per partner and constant across
surfaces. Register and `audience` (partner or internal) sit on the channel
rendering.

*Why:* the brief's step 5 requires tone to persist into the CRM view.
Collapsing the two would weaken CMS-19, CMS-31 and CMS-06 together.

*Reopens if:* EG confirms their operating model genuinely treats tone as
channel-determined (Q6b). One field plus a re-scoping of three capabilities.

### D-06 · Grammatical agreement deferred out of the POC
Plain substitution only. A value of 1 produces "seen 1 times"; Arabic's
six plural categories are not handled.

*Why:* substitution is enough to prove consistency, translation and
versioning. ICU with a generation-assisted authoring layer is the
production answer.

*Must be stated in the readout.* CMS-47 is demonstrated in principle, not
proven.

### D-07 · Web is another channel, not a special case
Partner web and VMC are different surfaces; both are channels through the
same resolver.

*Consequence:* the pull surfaces need a current decision per partner
(DQ-8), which is the only architectural difference from the push surfaces.

### D-08 · Fallback content is authored, not hardcoded
A fallback variant per opportunity type, translated and approved like any
other content. Email and web fail open with it; CRM fails closed.

*Why:* copy embedded in the resolver is the one piece of partner-facing
text nobody reviews.

### D-09 · Globant builds, EG hosts, support undecided
Alert routing follows the support owner.

*Open:* SLA, on-call, runbook and severity definitions all wait on DQ-9.

---

## UC2 — partner web content model

### D-20 · Section is an explicit container
Theme, background, spacing, width and the section heading live on `section`
(CT01), which also covers C005 Headline, C019 Background Section and C020
Separator.

*Why:* Contentful has no presentation layer, so without a container these
properties ride on all 17 blocks and drift apart.

*Cost:* one more nesting level — page → section → blocks.

### D-21 · Variation-by-presentation becomes a property, never a type
C021 (image right), C025 (colour background), C022 (eyebrow), C032 (CTA),
C011 (accordion slot) are properties on their parent type.

*Why:* content types are scarce and migration-heavy; fields are cheap.

### D-22 · One collection container, several card types
C013, C016 and C031 unify into `cardCollection` with a `layout` property.
`mediaCard`, `editorialCard` and `testimonial` stay distinct.

*Why:* the containers share a content model; the cards do not — the
editorial card's link is required and meaningless on a media card.

### D-23 · Four types kept distinct
`ctaCard` vs `infoBoxes`, `mediaCard` vs `editorialCard`, `anchorNav` vs
site navigation, `heroBanner` vs `promoBanner`.

*Why:* required fields diverge, or lifecycle and editorial role differ.
Recorded so the count reads as reasoned rather than minimised.

### D-24 · Chrome and page metadata are not components
Header, footer, cookie banner, breadcrumb, article header, author block,
tags, share and feedback render from `metaInfo`, `navigation`, page fields
or taxonomy.

*Why:* as placeable blocks they could be omitted, duplicated or made to
disagree with the page they sit on.

### D-25 · Model scoped to the three pilot pages
Not designed to absorb the 86-component historical matrix, which is
reference only.

*Reopens if:* the pilot extends to the wider site — content type limits
would need checking against the Contentful entitlement first.
