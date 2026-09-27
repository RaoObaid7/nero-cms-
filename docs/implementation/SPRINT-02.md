# Sprint 2 — Editorial Workflows and Blocks

Status: Planned. Scope covers PRD Phase 2 only.
Repository: https://github.com/Magnero-Agency/nero-cms
Related: `docs/PRD.md` sections 6 and 12 (Phase 2), `docs/implementation/SPRINT-01.md`, `docs/implementation/SPRINT-01-REVIEW.md`

## 1. Goal

Turn the Sprint 1 foundation into a system content editors can actually publish
with. A WordPress-experienced editor must be able to assemble a page from
labeled blocks, save a draft, preview it, schedule it, and restore a previous
version — without developer assistance and without drafts ever reaching the
public site.

Sprint 1 delivered the workspace, the published-only read seam and the
permission model. Sprint 2 delivers the content model and the editorial
lifecycle on top of it.

## 2. In scope

### 2.1 Articles collection (`packages/cms-core`)

A reusable `Articles` collection, sibling to `Pages`, with: title, slug,
excerpt, cover image (relation to media), body (rich text), taxonomy relations,
author relation, and publication metadata. Draft/publish versions and version
history enabled, matching the `Pages` access model.

### 2.2 Taxonomy collections (`packages/cms-core`)

`Categories` and `Tags` collections with name, slug, description and optional
parent for categories. Both are reusable and carry no customer-specific fields.
Article-to-taxonomy relations are many-to-many for tags, and single primary
category plus optional additional categories for categories — the primary
category is what SEO-103 will consume in a later sprint, so the field must exist
now with a stable name.

### 2.3 Block catalog (`packages/cms-core`)

Eight blocks per PRD section 6, each with a stable `slug`, typed schema,
validation, editor-facing label and description, and a content fixture:

1. `hero` — heading, subheading, optional media, optional CTA
2. `richText` — lexical rich text
3. `imageText` — media + rich text with a constrained layout variant
4. `gallery` — ordered media list with captions
5. `callout` — quotation or information variant with constrained styling
6. `contentCards` — list of linked cards with title, summary, optional media
7. `faq` — question/answer pairs
8. `cta` — heading, body, one or two actions

Editor constraints per PRD: meaningful labels, constrained variants via select
fields, sensible defaults, no arbitrary pixel values, no unlimited nesting, no
executable JavaScript inputs. Templates own the main H1 — block headings start
at H2 and the heading level is not a free-form editor input.

A `layout` blocks field is added to `Pages` and `Articles` consuming this
catalog. The catalog is exported so a consumer app can select a subset and add
project-specific blocks without forking.

### 2.4 Block rendering (`packages/web-core` + `packages/ui`)

A renderer contract that maps persisted block data to React Server Components.
Unknown or incompatible block data must produce a controlled, monitored outcome
— a logged warning and a skipped block — never a thrown render error and never
silent content loss. This is an explicit PRD requirement and needs a test.

`packages/ui` gains the presentational primitives the blocks need. Boundaries
from Sprint 1 still hold: `ui` imports neither `cms-core` nor `web-core`.

### 2.5 Draft preview

A preview route in `apps/tuyba` that reads draft content through the existing
`web-core` seam, supplying the `previewToken` the Sprint 1 fix requires. Payload
live preview / preview URL configuration wired so the admin "Preview" button
reaches it. Preview responses must be noindexed and must not be cached publicly.

### 2.6 Scheduled publishing

A `publishAt` field plus a scheduler that transitions scheduled documents to
published. Jobs must be idempotent, bounded, and safe against concurrent
duplicate execution (PRD section 10.3). A document scheduled for the future must
not appear in published reads before its time.

### 2.7 Version history and restore

Version history retained and restorable through the admin. A restore test must
prove a restored version becomes the served content.

### 2.8 Editor experience documentation

`docs/EDITORIAL.md`: how to build a page from blocks, how drafts and preview
work, how scheduling works, how to restore a version. Written for an editor, not
a developer — this is the artifact the Phase 2 editor gate is run against.

## 3. Constraints

- All boundaries from `docs/implementation/ENGINEERING-RULES.md` remain in force
  and are lint-enforced.
- No customer-specific branching in shared packages. TUYBA-specific choices live
  in `apps/tuyba`.
- Drafts must not reach public reads. The Sprint 1 seam is the only content
  access path; do not add a second one.
- Rich text and block content must not permit executable JavaScript.
- Expensive analysis stays off the public rendering path.
- Every block needs a fixture; a registered block with no fixture is incomplete.

## 4. Out of scope

- All SEO capabilities (Sprint 3A/3B). The primary-category field exists but
  nothing consumes it yet.
- Public site templates and search beyond what is needed to render blocks.
- GTM, forms, analytics.
- S3 media storage adapter; local uploads remain development-only.
- Production migrations.

## 5. Acceptance criteria

1. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build`
   all exit zero. Build still requires no database.
2. CI passes including the type-generation and database smoke steps.
3. Articles, Categories and Tags collections exist with draft/publish versions
   and the Sprint 1 access model. Covered by tests.
4. All eight blocks are registered with stable slugs, typed schemas and
   fixtures. A test asserts every registered block has a fixture and a renderer.
5. Unknown block data is skipped with a logged warning rather than throwing.
   Proven by a test that feeds the renderer an unregistered block type.
6. A scheduled-but-not-yet-due document does not appear in published reads.
   Proven by a test.
7. A restored version becomes the served content. Proven by a test.
8. The preview route returns draft content only with a valid preview token, and
   returns published content or an error without one. Proven by a test.
9. Preview responses carry noindex and are not publicly cacheable.
10. `docs/EDITORIAL.md` exists and covers blocks, drafts, preview, scheduling and
    restore.
11. Manual check carried over from Sprint 1: the admin renders the rich-text
    field correctly. Confirm against a running admin and record the result.

## 6. Verification protocol

Same standard as Sprint 1 and non-negotiable:

- Run every command and read real output. A configured field is not a feature.
- For each security-relevant behavior (draft leakage, scheduling, preview token),
  prove the test is not vacuous: break the implementation, observe the test fail,
  restore it, observe it pass. Report what was seen.
- The database-dependent criteria (3, 6, 7) need a real PostgreSQL run via
  `docker compose up -d`, not a mocked assertion alone.

## 7. Risks

- Block schema churn is expensive after content exists. Stable slugs and typed
  schemas are load-bearing, so get names right in this sprint.
- A scheduler in a single-instance deployment is easy; the PRD requires it to be
  safe under concurrency. Design for the multi-replica case now even though only
  one instance runs today.
- Live preview configuration couples the admin to a frontend route. Keep the
  coupling in `apps/tuyba`, not in `cms-core`.
