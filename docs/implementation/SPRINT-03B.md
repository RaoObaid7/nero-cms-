# Sprint 3B — Advanced SEO, GTM and Editorial Hardening

Status: **In Progress** — core implementation complete; pending E2E tests and generate:types run.
Repository: https://github.com/Magnero-Agency/nero-cms
Related: `docs/PRD.md` sections 7 and 12 (Phase 3B), `docs/implementation/SPRINT-03A.md`,
`docs/implementation/SPRINT-03A-REVIEW.md`

## 1. Goal

Close the two scope-overflow items from Sprint 3A (GTM and SEO-120) and deliver
the full provider-independent advanced SEO suite. When this sprint closes:

- Every Phase 3B SEO ID (SEO-104 through SEO-122, minus those deferred to
  Phase 6) has implementation and test evidence — no stubs, no mocks.
- GTM loads on public pages, is consent-aware, never doubles on navigation, and
  is excluded from the admin and preview environments.
- SEO permissions are enforced server-side; per-customer module enablement is a
  real config option, not a field anyone can toggle.
- The deferred cleanup items from the 3A review (author display name, primary
  category breadcrumbs, lint enforcement, taxonomy cache producers,
  `accessEnforced`/`draftAuthorized` seam hardening) are resolved.

## 2. In scope

### 2.1 Google Tag Manager plumbing (carried from 3A, B1)

`packages/cms-core`:

- A `GtmSettings` Payload Global with a validated container ID
  (`GTM-` + 7 alphanumeric characters), an `enabled` boolean and a note that
  changes are restricted to admins and retained in version history.
- Container ID format validated at the field level; an invalid value must
  surface as a Payload field error, not a runtime error.
- A per-environment override mechanism so staging IDs never leak into
  production: the container ID in the database is the fallback; the
  `GTM_CONTAINER_ID` environment variable overrides it when set.
- Version history enabled on the global so admin-level changes are auditable.

`packages/web-core`:

- A `<GtmLoader>` client component that accepts the container ID and a
  consent-granted flag and injects the GTM script once. It must be idempotent:
  calling it a second time with the same ID must not add a second tag. The
  guard is `window.__gtm_loaded` (a module-private sentinel, not
  `window.dataLayer`).
- A `<ConsentProvider>` and `useConsent()` hook: conservative default
  (no non-essential tracking before consent); `grantConsent()` /
  `denyConsent()` / `withdrawConsent()` surface and update localStorage so the
  choice persists across sessions.
- A `dataLayer` helper module: `pushPageView(path)`, `pushCtaClicked(label)`,
  `pushFormStarted(formId)`, `pushLeadSubmitted(formId)`. All PII fields
  (name, email, phone, free-text, health inputs) are rejected at the call
  site; page/location fields are sanitized by stripping query strings and
  fragment identifiers.
- A `<ConsentBanner>` primitive in `packages/ui` (accessible, no PII,
  minimal — renders the grant/deny controls, nothing more).

`apps/tuyba`:

- Wire `<GtmLoader>` in the frontend layout after the consent banner; the
  admin layout must not load it.
- The proxy (`proxy.ts`) must not serve GTM for `/preview` routes.
- Route-change deduplication: `<GtmLoader>` fires `pushPageView` exactly once
  per navigation, preventing double events from both a Next.js
  `usePathname`-observer and a GTM history trigger. Ownership rule: the
  application fires `page_view` via `pushPageView`; the GTM container must not
  also have a history-change trigger.

Tests:

- `packages/web-core`: `GtmLoader` unit tests: script injected once with valid
  ID; second call with same ID is a no-op; no script without consent.
- `packages/web-core`: `ConsentProvider` unit tests: default state is denied;
  `grantConsent` triggers GTM load; `withdrawConsent` prevents future events.
- `packages/web-core`: `dataLayer` helpers: PII fields are stripped before
  pushing; path query strings are sanitized.
- `apps/tuyba` E2E: a new journey `10-gtm-loading.spec.ts` asserts that the
  public homepage sends one GTM script tag; the admin route does not; the
  preview route does not; navigating to a second page does not add a second tag.

### 2.2 SEO permissions and per-customer module enablement (carried from 3A, B2)

`packages/cms-core`:

- `seoFields()` gains a required `seoAccess` option: a Payload `FieldAccess`
  function applied as `access.update` on every SEO field, so only the roles
  that pass the check can modify SEO metadata. Default to `isAdminOrEditor`.
  Exported so a consuming app can tighten it (e.g. admin-only) or loosen it if
  its own RBAC requires it.
- `BuildNeroConfigOptions` gains a boolean `seoEnabled` option (default: `true`).
  When `false`, the SEO fields are omitted entirely from the collections they
  are injected into, so they do not appear in the admin or the generated types,
  and no SEO group is included in API responses. "Disabled modules do not ship
  unnecessary public runtime" is the PRD requirement this satisfies.
- Tests: asserting that `seoEnabled: false` produces a config with no SEO
  fields; asserting that `seoEnabled: true` (default) produces them; asserting
  that a non-admin role is blocked by the default `seoAccess`.

### 2.3 Sprint 3A cleanup

**Author display name (NB3)**:

- Add a `displayName` text field to the `Users` collection. Public-facing
  schema helpers (e.g. `authorName()` in `blog/[slug]/page.tsx`) use
  `displayName` rather than `email`. The field is optional; when absent, the
  article's JSON-LD `author` is omitted rather than leaking the email.
- Test: author email does not appear in any public JSON-LD output.

**Primary category in breadcrumbs (NB4)**:

- `blog/[slug]/page.tsx` breadcrumb trail: when `primaryCategory` is
  populated, the trail is `Home › Blog › <Category name> › <Article title>`
  rather than `Home › Blog › <Article title>`.
- Test: the breadcrumb schema JSON-LD for an article with a primary category
  contains four items; without one it contains three.

**Lint-enforced architecture boundaries (NB5)**:

- Add `@nx/eslint-plugin` or equivalent `no-restricted-imports` rules in
  `tooling/eslint/base.js` to enforce: `packages/ui` imports nothing from
  `@nero/*`; `packages/web-core` imports nothing from `payload` or
  `@payloadcms/*`; `packages/cms-core` imports nothing from `@nero/web-core`
  (the public content access layer is unidirectional).
- The current manual cleanliness is real; this makes violations a build error
  rather than a convention.

**Taxonomy cache tag producers (NB6)**:

- The `afterChange` hook wired by `createPublishLifecycleHooks` applies to the
  `SCHEDULABLE_COLLECTIONS` (`pages`, `articles`). Extend to cover `categories`
  and `tags` as well so that renaming or deleting a taxonomy term invalidates
  the category and tag listing/detail caches.

**`accessEnforced`/`draftAuthorized` seam hardening**:

- Currently `accessEnforced: true` is set unconditionally in the adapter even
  on draft paths (where `overrideAccess: true` is used). Split into two
  independent invariants: `accessEnforced: true` is set only for
  non-draft paths; `draftAuthorized: true` is a separate flag set only after
  `assertAuthorizedDraftAccess` passes and means "the preview token was
  verified." `assertAccessEnforced` checks `accessEnforced`; a new
  `assertDraftAuthorized` checks `draftAuthorized`. Both must be set on the
  preview path; only `accessEnforced` must be set on the published path.
- Tests covering all four cases: published path must carry `accessEnforced`;
  draft path must carry `draftAuthorized`; published path must not carry
  `draftAuthorized`; a broken adapter that sets neither is caught at runtime.

### 2.4 SEO analysis engine (SEO-104, SEO-105, SEO-106)

**Text extraction utility** (`packages/cms-core`):

- `extractDocumentText(doc: Record<string, unknown>): ExtractedContent`
  walks the document's `content` (Lexical), `layout` (blocks array), `title`,
  `excerpt`, `slug`, and each block's text fields. Returns: `{ title, excerpt,
slug, headings: string[], body: string, links: { url: string; text: string }[],
images: { url: string; alt?: string }[] }`.
- Tested with fixtures for every block type and for a typical Lexical body.

**Keyword analysis** (SEO-104, `packages/cms-core`):

- `analyzeKeywords(extracted: ExtractedContent, keyword: string): KeywordResult`
  returns: `{ presentInTitle, presentInDescription, presentInSlug,
presentInFirstHeading, presentInBody, densityPercent, wordCount,
slugLength }`.
- Edge cases: missing keyword returns all false; zero-word body returns
  density 0.

**Readability and link analysis** (SEO-105, `packages/cms-core`):

- `analyzeReadability(body: string): ReadabilityResult`: Flesch Reading Ease
  (English text). Score ranges and labels: ≥70 easy, 60-69 fairly easy,
  30-59 medium, <30 difficult.
- `analyzeLinks(extracted: ExtractedContent): LinkResult`: counts internal
  links (relative URLs), external links (absolute), images without alt text.
- `findDuplicateKeywords(keywords: string[]): string[]`: case-insensitive
  duplicate detection.

**SEO checklist and score** (SEO-106, `packages/cms-core`):

- `buildSeoChecklist(doc, keywords): SeoChecklist` aggregates keyword,
  readability and link results into labelled, explanatory pass/warn/fail
  items. Score: 0-100 as a weighted count of passing checks.
- Internal link suggestions: `suggestInternalLinks(doc, allPublishedDocs):
InternalLinkSuggestion[]` — returns up to 5 published documents that share
  the same primary category or any tag, ranked by shared taxonomy count. No
  AI, no external API.

**Admin display** (`packages/cms-core` client component):

- A `SeoAnalysisField` UI field component (a Payload `ui` type) rendered in
  the `Pages` and `Articles` edit screens below the SEO group. It calls
  a `/api/seo-analysis` tuyba-side route (gated to admins/editors, returns
  JSON, never cached) with the current document ID and displays the checklist
  results.
- The analysis route runs server-side only; it does not appear in the public
  bundle.
- Tests: each analysis function is unit-tested with fixtures; the component
  is integration-tested against the tuyba API route.

### 2.5 Opt-in news and video sitemaps (SEO-108)

`packages/cms-core`:

- Add a `newsArticle` boolean field to `Articles` collection (default `false`)
  indicating the article is a news item. A corresponding `publicationName`
  field on `GtmSettings` (or a new `SiteSettings` global) holds the
  publication name required by Google News.
- An `isNewsEnabled` flag in `BuildNeroConfigOptions` (default `false`) gates
  whether the news sitemap route is present at all.

`apps/tuyba`:

- `/news-sitemap.xml` route: lists published `newsArticle === true` articles
  with `<news:news>` elements. Excludes noindex, drafts, scheduled-but-not-due.
- `/video-sitemap.xml` route: lists published pages/articles containing a
  `video` block. Omitted when no video blocks exist.
- Both sitemaps reference each other in `sitemap.ts` via `<sitemap>` entries.
- Tests: a news article appears in `/news-sitemap.xml`; a regular article does
  not; a non-published news article does not.

### 2.6 Regex redirects, priority and conflict inspection (SEO-110)

`packages/cms-core`:

- Add `sourceType: "path" | "regex"` to the `Redirects` collection (default
  `"path"`, existing behavior unchanged).
- A `priority` integer field (default 10) to order redirect evaluation when
  multiple rules could match.
- A `beforeValidate` hook that, for `regex` type, compiles the pattern to
  detect catastrophic backtracking heuristics (exponential quantifier nesting)
  and rejects the save with a field error if found. Uses Node's `RegExp`
  constructor; execution time is bounded by a 10 ms timeout in the validation.
- Conflict detection: a `beforeChange` hook queries existing redirects for
  identical `source` values and warns (a non-fatal field error surfaced in the
  admin) when a duplicate is found.

`apps/tuyba` (`proxy.ts`):

- Extend `findRedirect` to evaluate path redirects first (by priority), then
  regex redirects in priority order.
- Cache the compiled `RegExp` instances in a module-level `Map` so they are
  not recompiled per request (addresses NB2 from the 3A review).
- Tests: a regex redirect matches the correct URLs; a path redirect takes
  precedence over a lower-priority regex; a duplicate source surfaces a
  conflict warning.

### 2.7 Basic 404 monitoring (SEO-111)

`packages/cms-core`:

- A `NotFoundEvents` collection: `path` (text, indexed), `referrer` (text,
  nullable), `userAgent` (text, nullable), `count` (integer, default 1),
  `createdAt` (auto). The `path` field is sanitized: query strings are stripped
  before storage to bound cardinality and prevent sensitive query data leakage.
  The `userAgent` field is truncated to 200 characters.
- A `cleanupNotFoundEvents` function that deletes records older than 90 days.
  Designed to be called from a cron job; not wired to a timer here.
- Read access: admin only. No editor or public access.

`apps/tuyba`:

- The `not-found.tsx` page (or a dedicated server action) records the event
  via the Payload local API with `overrideAccess: true` (write-only, no read
  bypass). Only the sanitized path and referrer from the `Referer` header are
  stored; the request URL's query string is stripped.
- Tests: a 404 request logs an event; the sanitization strips query strings;
  an event older than 90 days is removed by the cleanup function.

### 2.8 Schema enhancements

**JSON-LD structural validation** (SEO-112 completion):

- `validateJsonLd(schema: unknown): string[]` in `packages/cms-core`: checks
  that `@context`, `@type` and required fields for each supported type are
  present. Returns a list of human-readable error strings (empty = valid).
  Does not make any network calls. Covers: `Article`, `BlogPosting`,
  `BreadcrumbList`, `Organization`, `WebSite`, `LocalBusiness`,
  `FAQPage`, `VideoObject`, `PodcastSeries`, `PodcastEpisode`.

**Custom schema builder** (SEO-113):

- A `customSchema` JSON text field on `Pages` and `Articles`. The field
  must contain valid JSON; a `beforeValidate` hook calls `JSON.parse` and
  surfaces the parse error if invalid.
- On the public route, the custom schema is merged with the generated schemas
  and emitted in `<script type="application/ld+json">`. The merged output is
  validated by `validateJsonLd` before emission; an invalid custom schema logs
  a server-side warning and is omitted rather than breaking the page.
- Tests: a valid custom schema appears in the HTML; an invalid one is omitted
  with a warning; the merge does not duplicate graph IDs.

**Schema import** (SEO-114):

- A `/api/schema-import` route in `apps/tuyba` (admin/editor access only)
  accepting a JSON body containing a schema object. The route validates the
  body with `validateJsonLd`, returns the list of validation errors in a
  dry-run response, and — on explicit confirmation (`?apply=true`) — writes the
  schema to the specified document's `customSchema` field.
- Input validation: bounded size (≤ 32 KB), `Content-Type: application/json`
  required, `@type` must be from the supported set. Never executes any script
  in the imported data.
- Tests: a valid schema passes dry-run; an invalid one surfaces errors; a too-
  large body is rejected; the `apply` path persists to the document.

**Video detection and Speakable markup** (SEO-116):

- `extractVideoBlocks(layout: unknown[]): VideoBlock[]` in `packages/cms-core`.
  (Future: a `video` block will be added to the catalog; for now, gallery
  blocks referencing a video media type are detected by `mimeType` prefix
  `video/`.)
- `videoSchema(block: VideoBlock, serverURL: string)` produces a `VideoObject`
  JSON-LD preset.
- A `speakableSchema(selector: string[])` function for `cssSelector`-based
  Speakable markup, wired to the article title and excerpt selectors.
- Tests: gallery blocks with video media produce VideoObject schemas; blocks
  without do not; Speakable schema contains the correct selectors.

**Image alt/title automation** (SEO-117):

- An `afterChange` hook on `Media`: when `alt` is empty, auto-populate it from
  the filename (stripped of extension and hyphens/underscores replaced by
  spaces). Preserves intentionally empty `alt` if a `altIsDecorative: true`
  flag is set.
- `altIsDecorative` boolean field on `Media` (default `false`); when `true`,
  `alt` must be explicitly empty and the automation is suppressed.
- Tests: filename `hero-image.jpg` produces alt `hero image`; an explicit alt
  is never overwritten; `altIsDecorative` suppresses automation.

**Local business schema** (SEO-118):

- A `LocalBusiness` group field on `Pages` (opt-in, collapsible, collapsed by
  default): name, description, telephone, address (street, city, country),
  latitude, longitude, openingHours (text array), priceRange, logo relation to
  media.
- `localBusinessSchema(fields, serverURL)` in `packages/cms-core` produces the
  `LocalBusiness` JSON-LD preset. Multiple locations are not required in this
  sprint (the PRD notes "multiple-location models/schema" under 3B but defers
  the UI to 3B; the schema function accepts a single location object).
- Tests: a page with local business fields emits a valid `LocalBusiness` schema;
  a page without does not.

**Podcast schema** (SEO-119):

- An `isPodcastEpisode` boolean on `Articles` (default `false`). When `true`,
  additional fields appear: `podcastEpisodeNumber` (integer), `podcastSeason`
  (integer), `podcastAudioUrl` (URL, validated by `validateSafeHref`).
- A `SiteSettings` global (introduced here or reusing `GtmSettings` as the
  base) holds the `PodcastSeries` fields: series name, description, feed URL,
  author. These are shared by every episode on the site.
- `podcastSeriesSchema(settings)` and `podcastEpisodeSchema(article, settings)`
  produce the corresponding JSON-LD presets.
- Tests: an episode article emits episode + series schema; a non-episode does
  not; missing required fields omit the schema rather than breaking the page.

### 2.9 Import and export (SEO-121)

`packages/cms-core`:

- `parseYoastRedirectCsv(csv: string): ParsedRedirect[]` parses the Yoast
  Redirect Manager CSV format (`old URL,new URL,type`). Returns parsed rows;
  throws on empty input. The importer normalizes absolute URLs to relative
  paths where the host matches the provided `siteUrl`.
- `parseSeoPressCsv(csv: string): ParsedRedirect[]` for the SEOPress format.

`apps/tuyba`:

- A `/api/redirect-import` route (admin only): accepts a multipart form with a
  CSV file (≤ 512 KB), the source format (`yoast` | `seopress`), a boolean
  `dryRun`, and the `siteUrl` for host normalization.
- Dry-run returns the parsed rows, a count, and detected conflicts (duplicates
  against existing redirects) without writing to the database.
- Apply mode writes only non-conflicting rows; conflicting rows are reported.
  Import is idempotent: repeated import of the same file with the same sources
  does not create duplicate rows.
- Tests: a Yoast CSV round-trips correctly; a SEOPress CSV round-trips; a
  conflicting import reports the conflict; an oversized file is rejected.

### 2.10 Aggregate SEO overview (SEO-122)

`apps/tuyba`:

- A `/api/seo-overview` route (admin only): returns a JSON summary of all
  published pages and articles: count of documents missing `metaTitle`,
  missing `metaDescription`, flagged `noindex`, without a `coverImage`, and
  without a `primaryCategory` (articles only).
- A Payload admin `ui` component (`SeoOverviewField`) placed on the `Pages`
  collection's list view or as a custom admin page that calls this endpoint and
  renders the summary as labelled counts. No third-party charting library.
- Tests: the endpoint returns correct counts for a seeded dataset; a published
  document missing `metaTitle` appears in the missing-title count; a draft does
  not.

## 3. Constraints

All Sprint 1/2/3A constraints remain:

- Boundaries from `ENGINEERING-RULES.md`; now lint-enforced.
- `@nero/web-core` remains the only public content read path.
- Expensive analysis stays off the public rendering path.
- No customer-specific branching in shared packages.
- Every capability needs test evidence; stubs and mocks are not evidence.
- PII must not enter analytics events, logs or public responses.

## 4. Out of scope

- SEO-115 (remote schema import, SSRF controls) — Phase 6.
- SEO-123-127 (Search Console, GA4, rank tracking, reports) — Phase 6.
- Production GTM container validation (requires real container; report pending
  rather than inventing success per PRD §9.3/GTM-03).
- S3 media storage adapter.
- Phase 4 forms (lead forms, CRM delivery).
- Production migrations.

## 5. Acceptance criteria

1. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build`
   all exit zero.
2. CI passes including type generation, database smoke and all E2E journeys
   (the existing 9 + the new GTM journey).
3. GTM: container ID loads on public pages with consent handling; never in admin
   or preview; never twice on navigation. Proven by the E2E journey and unit
   tests.
4. SEO-120: a non-admin role cannot modify SEO fields. A config with
   `seoEnabled: false` has no SEO fields in collections. Proven by tests.
5. All Phase 3A SEO IDs previously partial (SEO-101 dynamic templates,
   SEO-102 snippet preview, SEO-103 primary-category breadcrumbs, SEO-107
   per-type inclusion/exclusion, SEO-112 validation) are completed.
6. Every Phase 3B SEO ID (SEO-104 through SEO-122 as assigned above) has
   implementation and test evidence. Proven by tests.
7. The slug-auto-fill stop condition (published lock) is now also proven by a
   test asserting that `SlugField`'s status effect fires correctly when `_status`
   is populated from the form state. (Carried from 3A B5 — the E2E test added
   in the 3A follow-up covers the behavior but not the component logic directly;
   a unit test for the React effect is the remaining gap.)
8. Architecture boundaries are lint-enforced: a deliberate violation (importing
   `payload` in `packages/web-core`) fails `pnpm lint`.
9. Taxonomy cache tags have producers: renaming a category invalidates the
   category and article-listing caches. Proven by a test.
10. Author display name is used in JSON-LD: no email address appears in any
    emitted schema. Proven by a test.
11. `accessEnforced`/`draftAuthorized` seam is split: a broken adapter that
    sets neither is caught at runtime. Proven by a test.

## 6. Verification protocol

Same as previous sprints, non-negotiable:

- Run every command; read real output.
- For security-relevant behaviors (GTM exclusion from admin/preview, SEO access
  control, 404 data sanitization, schema import SSRF surface), prove each test
  is non-vacuous: break the implementation, observe the specific test fail,
  restore, observe it pass.
- The GTM E2E journey must run against a real built application.

## 7. Risks

- SEO analysis computed in the admin requires text extraction from Lexical's
  JSON format and from every block type. Keep the extractor as a pure function
  so it can be unit-tested without a running application.
- The `validateJsonLd` function is a structural check, not a schema.org
  vocabulary validator. It must not claim more than it provides: it catches
  missing required fields for the supported types, not semantic correctness.
- Regex redirect validation: catastrophic backtracking detection is heuristic
  (pattern inspection), not guaranteed. The 10 ms execution timeout is a
  backstop, not a proof. Document the limitation.
- GTM double-event prevention: the ownership rule (app fires `page_view`, GTM
  container must not also have a history trigger) cannot be enforced in code.
  Document it in the GTM configuration guide.
