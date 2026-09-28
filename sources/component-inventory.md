# Live Component Inventory — Expedia Group Partner

Single source of truth for the project. Last updated: 2026-09-15 (third export ingestion; complete inventory with internal approval).

Historical matrix: Matriz_Componentes_Unificada.xlsx (86 components). Mode: inference (live site, Scenario D). Screen inventory: `inventario-de-pantallas.md` (3 templates). Screens analyzed: P01 Campaign landing page, P02 Join us with form, P03 Blog article.

## Pre-Matrix gate status

- Internal analyst approval: 35/35 (19 Existing, 9 Variations, 7 New candidates). No duplicates (verified by name and ID). No components in Detected, Rejected, or Pending re-approval.
- Client approval: PENDING. The formal Matrix gate requires "Client approved"; a Matrix generated before that is labeled DRAFT.

## Approved components (internal)

| ID | Component | Type | Variation of | Matrix status | Reference | Screens |
| --- | --- | --- | --- | --- | --- | --- |
| C001 | Header | Component | - | Existing | ID 1 | P01 Campaign landing page, Global, P02 Join us with form, P03 Blog article |
| C002 | Footer | Component | - | Existing | ID 83 | P01 Campaign landing page, Global, P02 Join us with form, P03 Blog article |
| C003 | Cookie Banner | Component | - | Existing | ID 36 | Global, P02 Join us with form, P03 Blog article |
| C004 | Hero Banner | Component | - | Existing | ID 5 | P01 Campaign landing page |
| C005 | Headline | Base | - | Existing | ID 84 | P01 Campaign landing page, P03 Blog article |
| C006 | Embedded Video | Component | - | Existing | ID 24 | P01 Campaign landing page, P03 Blog article |
| C007 | Anchor Navbar | Component | - | Variation | ID 57 | P01 Campaign landing page, P03 Blog article |
| C008 | Image + Text Split Banner | Component | - | Existing | ID 6 | P01 Campaign landing page |
| C021 | Image + Text Split Banner (image on the right) | Component | C008 | Variation | ID 6 | P01 Campaign landing page |
| C009 | Comparison Table | Component | - | New candidate | - | P01 Campaign landing page |
| C010 | Info Boxes | Component | - | Existing | ID 17 | P01 Campaign landing page |
| C011 | Split Banner + Accordion | Component | - | Existing | ID 46 | P01 Campaign landing page |
| C012 | Promo Banner with Background Image | Component | - | Existing | ID 50 | P01 Campaign landing page |
| C013 | Card Carousel | Component | - | Variation | ID 75 | P01 Campaign landing page |
| C014 | Video Card | Component | - | Existing | ID 80 | P01 Campaign landing page |
| C015 | Accordion | Component | - | Existing | ID 22 | P01 Campaign landing page, P03 Blog article |
| C016 | News Card Grid | Component | - | Existing | ID 78 | P01 Campaign landing page, P03 Blog article |
| C017 | Editorial Card | Component | - | Variation | ID 79 | P01 Campaign landing page, P03 Blog article |
| C018 | Button | Base | - | Existing | ID 82 | P01 Campaign landing page, Global, P02 Join us with form, P03 Blog article |
| C019 | Background Section | Component | - | Existing | ID 85 | P01 Campaign landing page, P02 Join us with form, P03 Blog article |
| C020 | Separator | Base | - | Existing | ID 86 | P01 Campaign landing page, P03 Blog article |
| C022 | Hero Banner with Breadcrumb | Component | C004 | Variation | ID 5 | P02 Join us with form |
| C023 | Breadcrumb | Base | - | Existing | ID 64 | P02 Join us with form, P03 Blog article |
| C024 | Lead Capture Form | Component | - | Variation | ID 26 | P02 Join us with form |
| C025 | Promo Banner with Color Background | Component | C012 | Variation | ID 50 | P02 Join us with form |
| C026 | Article Header | Component | - | New candidate | - | P03 Blog article |
| C027 | Rich Text | Component | - | New candidate | - | P03 Blog article |
| C028 | Stats Block | Component | - | Existing | ID 77 | P03 Blog article |
| C029 | CTA Card with Icon | Component | - | New candidate | - | P03 Blog article |
| C030 | Calculator | Component | - | Variation | ID 30 | P03 Blog article |
| C031 | Testimonials | Component | - | Existing | ID 15 | P03 Blog article |
| C032 | Image + Text Split Banner with CTA | Component | C008 | Variation | ID 6 | P03 Blog article |
| C033 | Author Block | Component | - | New candidate | - | P03 Blog article |
| C034 | Tags and Share | Component | - | New candidate | - | P03 Blog article |
| C035 | Page Feedback | Component | - | New candidate | - | P03 Blog article |

## Components pending validation (open questions for the client)

- C001 · Header: Open state of the mobile menu's third level not captured (the structure is visible in the Solutions panel).
- C003 · Cookie Banner: Confirm whether the migration keeps OneTrust as an external script or implements the banner as an AEM component.
- C006 · Embedded Video: The actual player was not evaluated (screenshots show the official thumbnail).
- C007 · Anchor Navbar: Decide whether to register it as a variation of Navbar (ID 57) or as a new component 'Anchor navigation'.
- C021 · Image + Text Split Banner (image on the right): Registered as a variation with an ID at the analyst's request; the matrix usually treats the image side as a property of the Split Banner. Confirm the model before the Matrix.
- C009 · Comparison Table: Confirm the table's mobile behavior (horizontal scroll vs. hidden column).
- C009 · Comparison Table: Confirm whether it is an authorable component (content table) or a specific component.
- C012 · Promo Banner with Background Image: Decide whether to reference it as ID 50 (Banner Promo Background Image) or ID 35 (Banner Full).
- C013 · Card Carousel: QUESTION FOR THE ANALYST: should it be modeled as its own container (Card Carousel, a variation of Slide servicios ID 75) that hosts C014, or merged with C014 into a single 'Video Gallery' component? Choose one and approve.
- C013 · Card Carousel: State after clicking 'next' was not captured (arrow selector); slider behavior is confirmed by the site scan.
- C014 · Video Card: QUESTION FOR THE ANALYST: the matrix's Tutorial / Video Card (ID 80) uses an image and tags; here the media is an Embedded Video (C006) plus a caption. Is it the same component with the media as a property (Existing), a variation, or does it merge into 'Video Gallery' with C013?
- C014 · Video Card: Depends on the decision about C013.
- C017 · Editorial Card: Decide whether it is a variation of the Complementary Card (ID 79) or the News Card Grid's own card (ID 78).
- C022 · Hero Banner with Breadcrumb: Confirm whether the eyebrow is an optional property of the Hero Banner (C004) or justifies the variation.
- C024 · Lead Capture Form: [To validate] whether selecting the industry expands more fields (progressive form); not capturable without interacting.
- C024 · Lead Capture Form: Confirm whether the left column (logo + title + text) is part of the component or a separate Headline + image.
- C025 · Promo Banner with Color Background: Confirm whether the background (image or color) is a property of C012 instead of a variation with its own ID.
- C026 · Article Header: Confirm whether it is its own component or a fixed part of the article template (title, author, and date usually come from page properties).
- C027 · Rich Text: Confirm whether the footnotes (small gray text above a line) are a style variant of this component or a separate component.
- C028 · Stats Block: Confirm the reference: ID 77 describes the stats strip of the Split Banner Media (ID 76); here it appears on its own.
- C029 · CTA Card with Icon: Decide whether it is a new family or a single-box Info Boxes (ID 17) with a button.
- C030 · Calculator: Confirm whether it is a generic, configurable calculator (authorable fields and formula) or specific to this product.
- C030 · Calculator: State with modified values not captured.
- C031 · Testimonials: State after clicking 'next' not captured (arrow selector).
- C033 · Author Block: Confirm whether it is its own component or a fixed part of the article template fed by the author profile.
- C034 · Tags and Share: Confirm whether tags and share are a single component or two (Tag list and Share bar).
- C035 · Page Feedback: State after responding (thank-you message or comment field) not captured.

## Rejected components

(None.)

## Component architecture

```
P01 Campaign landing page
├── C001 Header (+ states)
├── C003 Cookie Banner (global overlay)
├── C004 Hero Banner (C018)
├── C019 Background Section > C005 Headline
├── C006 Embedded Video
├── C007 Anchor Navbar (sticky)
├── C005 Headline
├── C008 Image + Text Split Banner x3 / C021 (image on the right) x2
├── C005 Headline + C009 Comparison Table
├── C005 Headline + C010 Info Boxes
├── C011 Split Banner + Accordion > C015 Accordion
├── C012 Promo Banner with Background Image (C018)
├── C005 Headline + C013 Card Carousel > C014 Video Card > C006
├── C005 Headline + C015 Accordion (FAQ)
├── C016 News Card Grid > C017 Editorial Card (C018)
├── C002 Footer
├── C020 Separator (between sections, no visual)
```

```
P02 Join us with form
├── C001 Header
├── C022 Hero Banner with Breadcrumb > C023 Breadcrumb
├── C019 Background Section > C024 Lead Capture Form (C018)
├── C025 Promo Banner with Color Background (C018)
├── C002 Footer
├── C003 Cookie Banner (global overlay)
```

```
P03 Blog article
├── C001 Header
├── C023 Breadcrumb
├── C026 Article Header
├── C007 Anchor Navbar (4 items)
├── C027 Rich Text x3
├── C028 Stats Block
├── C019 Background Section > C005 Headline + C006 Embedded Video
├── C029 CTA Card with Icon (C018)
├── C005 Headline + C030 Calculator
├── C029 CTA Card with Icon
├── C005 Headline + C031 Testimonials
├── C005 Headline + C028 Stats Block
├── C032 Image + Text Split Banner with CTA (C018)
├── C005 Headline + C015 Accordion (FAQ)
├── C029 CTA Card with Icon
├── C033 Author Block
├── C034 Tags and Share
├── C035 Page Feedback (C018)
├── C016 News Card Grid > C017 Editorial Card
├── C027 Rich Text (footnotes)
├── C002 Footer
├── C020 Separator (between sections)
├── C003 Cookie Banner (global overlay)
```

## Decision log

- 2026-09-15: analysis of P01 (Campaign landing page) with globals. 20 components detected. Interactive artifact generated.
- 2026-09-15: decision ingestion (19:10 UTC export): 18 internal approvals. Comment on C008 applied as variation C021 (image on the right).
- 2026-09-15: analysis of P02 (Join us with form): C022, C023, C024, C025. C013/C014 open questions raised as an explicit decision.
- 2026-09-15: decision ingestion (19:24 UTC export): C013 and C014 approved as separate container + card ("this is fine as is"); C021 through C025 approved.
- 2026-09-15: analysis of P03 (Blog article): 10 new components (C026 through C035). "Recommended for you" (C016) validation closed: it rendered in the final run.
- 2026-09-15: decision ingestion (19:33 UTC export): C026 through C035 approved. Complete inventory: 35/35 internal approvals. Consolidation verified (no duplicates, consecutive IDs C001-C035). Ready for the Matrix in DRAFT mode pending client approval.
