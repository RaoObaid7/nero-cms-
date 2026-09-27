# Sprint 3A — Public Frontend, Editor Experience and End-to-End Tests

Status: Planned. Covers PRD Phase 3A plus the editor-experience and E2E work
agreed after the Sprint 2 review.
Repository: https://github.com/Magnero-Agency/nero-cms
Related: `docs/PRD.md` sections 6, 7, 8 and 12 (Phase 3A),
`docs/implementation/SPRINT-02.md`, `docs/implementation/SPRINT-02-REVIEW.md`

## 1. Goal

Make the site real for two audiences at once.

For **visitors**: published pages and articles render at their own URLs, with
blocks, metadata, sitemaps and redirects — the first sprint whose output a
person can actually browse.

For **editors**: the admin stops feeling like a developer tool and starts
feeling like WordPress. Editors coming from WordPress are the users this
platform is being built for, and friction against their habits is a defect,
not a polish item.

And for **us**: the first automated end-to-end tests. Until now every
browser-level check has been manual. The journey "create a page in the admin →
see it as a visitor" must be a test that runs in CI, not something a human
remembers to do.

## 2. In scope

### 2.1 Public routes (`apps/tuyba`)

- `/[slug]` — a published page, blocks rendered through the Sprint 2 renderer.
- `/blog` — published article listing, paginated, newest first.
- `/blog/[slug]` — a published article with its blocks and body.
- `/category/[slug]` and `/tag/[slug]` — filtered article listings.
- A 404 for anything unpublished, missing, or scheduled but not yet due.

All reads go through `@nero/web-core`. No new content access path. Drafts must
never appear on any of these routes, including in listings and pagination.

### 2.2 Editor experience — WordPress parity

This section is a first-class deliverable, not cleanup.

- **Slug auto-fill**: typing a title fills the slug live, slugified. The field
  stays editable. Auto-sync stops once the editor edits the slug manually or
  the document has been published, so published URLs never shift under an
  editor's feet. Applies to Pages, Articles, Categories and Tags.
- **Edit screen shape**: main editing column plus a sidebar carrying publish
  controls, status, `publishAt`, taxonomy and cover image — the arrangement a
  WordPress editor expects, rather than one long undifferentiated field list.
- **Familiar labels and grouping**: where Payload's defaults diverge from
  WordPress vocabulary, prefer the WordPress term. Group fields so the common
  path (title → content → publish) is the obvious one.
- Field descriptions written for editors, not developers.

The slug behavior must be implemented in `packages/cms-core` as a reusable
field/hook so every consumer site inherits it. The visual arrangement may use
Payload admin configuration in `cms-core` where it is generic.

### 2.3 Foundational SEO

Implement the PRD capabilities assigned to Phase 3A:

- SEO-101 — per-document SEO title/description, dynamic templates, content-type
  defaults.
- SEO-102 — search snippet preview, canonical URL, robots directives, Open
  Graph / Twitter metadata.
- SEO-103 — primary category and consistent breadcrumbs with markup.
- SEO-107 — XML sitemaps with content-type and taxonomy inclusion/exclusion.
- SEO-109 — redirect manager: 301/302/307, automatic slug-change redirects,
  410/451 responses.
- SEO-112 — non-commerce schema presets (Article/BlogPosting, BreadcrumbList,
  Organization, WebSite) with local structural validation.
- SEO-120 — SEO permissions and per-customer module enablement.

Drafts and scheduled-but-not-due documents must be absent from sitemaps.

### 2.4 Google Tag Manager plumbing

Shared GTM configuration, loader, event interface and consent interface. The
loader must not run in the admin or on `/preview`, and must not double-load on
client navigation. Consent state gates what reaches the dataLayer. No analytics
reporting integrations — those are Phase 6.

### 2.5 End-to-end tests

Playwright, running against a real built app and a real PostgreSQL database.
This is the sprint's other non-negotiable.

Required journeys:

1. **Editor publishes, visitor sees it**: log into admin, create a page with a
   title (assert the slug auto-filled), add a block, publish, then visit the
   public URL as an anonymous visitor and see the content.
2. **Draft stays private**: create a draft, confirm the public URL 404s and the
   draft's title appears nowhere in listings or the sitemap.
3. **Preview requires a token**: the preview URL with a valid token shows draft
   content; without one, or with a wrong one, it does not.
4. **Scheduled content stays hidden**: a future-dated document is absent from
   public routes until the scheduler publishes it.
5. **Smoke**: `/`, `/blog`, `/admin`, `/sitemap.xml` all respond 200 and render
   without console errors.
6. **Slug auto-fill**: verified in the admin as part of journey 1.

E2E runs in CI against the workflow's PostgreSQL service. A failing E2E fails
the build.

## 3. Constraints

- Boundaries from `docs/implementation/ENGINEERING-RULES.md` remain lint-enforced.
- `@nero/web-core` remains the only public content read path.
- Expensive SEO analysis stays off the public rendering path.
- No customer-specific branching in shared packages; TUYBA specifics live in
  `apps/tuyba`.
- Public pages must be cacheable; the cache-tag contract from Sprint 1 gets its
  first real producer and consumer here, including invalidation on publish and
  on slug change.

## 4. Out of scope

- Advanced SEO (Phase 3B): keyword analysis, readability, 404 monitoring,
  schema builder, imports.
- Analytics reporting, Search Console, rank tracking (Phase 6).
- Forms and lead capture (Phase 4).
- S3 media storage adapter; local uploads remain development-only.
- Live preview real-time sync (deferred from Sprint 2).
- Production migrations.

## 5. Acceptance criteria

1. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build`
   all exit zero; build still needs no database.
2. CI passes, including type generation, the database smoke check and the new
   E2E suite.
3. A published page renders at `/[slug]` with its blocks; a published article
   renders at `/blog/[slug]`; listings and taxonomy routes work.
4. Unpublished, scheduled-but-not-due and nonexistent content 404s on every
   public route and is absent from listings and sitemaps. Proven by tests.
5. Typing a title in the admin auto-fills the slug; the slug stays editable;
   auto-sync stops after manual edit or publication. Proven by a test.
6. The edit screen presents a main column plus a publish/taxonomy sidebar.
   Confirmed visually and recorded.
7. Every Phase 3A SEO ID has implementation and test evidence. A field or stub
   is not a completed capability.
8. Slug changes produce a redirect from the old URL; the redirect manager
   serves 301/302/307 and 410/451 as configured. Proven by tests.
9. GTM loads on public pages with consent handling, never in admin or preview,
   and never twice on client navigation. Proven by a test.
10. All six E2E journeys in section 2.5 pass against a real database, in CI.
11. Publishing invalidates the right cache tags; a slug change invalidates both
    old and new. Proven by a test.

## 6. Verification protocol

Unchanged and non-negotiable:

- Run every command and read real output.
- For each security-relevant behavior (draft leakage on public routes, sitemap
  exclusion, preview token, scheduled visibility), prove the test is not
  vacuous: break the implementation, observe the specific failure, restore,
  observe the pass. Report what was seen.
- E2E must run against a real built application and real PostgreSQL, not a
  mocked server.

## 7. Risks

- E2E suites rot when they are slow or flaky. Keep them few, deterministic, and
  seeded through the Payload local API rather than by clicking through setup.
- Slug auto-fill that keeps syncing after publication silently breaks live URLs
  and inbound links. The stop condition matters more than the convenience.
- Redirect handling interacts with caching; a cached 301 is hard to undo. Set
  conservative cache headers on redirects.
- Admin layout work can drift into redesigning Payload. The goal is WordPress
  familiarity using Payload's supported configuration, not a custom admin.
