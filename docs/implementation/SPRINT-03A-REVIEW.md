# Sprint 3A — Independent Review (round 1)

Reviewer: Claude Opus, against commit 84e3742.

## Verification commands run

| Command             | Result                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`         | ✅ clean (5 projects)                                                                                                                           |
| `pnpm typecheck`    | ✅ clean                                                                                                                                        |
| `pnpm test`         | ✅ 121 passed (web-core 33, ui 12, cms-core 60, tuyba 16 + 3 DB-gated files skipped locally; CI sets `DATABASE_URI` job-wide so they run there) |
| `pnpm format:check` | ✅ clean                                                                                                                                        |
| `pnpm build` / e2e  | not run (per instructions) — criterion 1's build half and criterion 10 are **unverified by me**                                                 |

---

## Item 2 — the `overrideAccess: args.draft === true` weakening: **SOUND, with a real seam degradation**

I traced every path. The adapter (`content-client.ts:47`) is module-private and never exported; `createContentClient` is the sole consumer. All four draft-capable entry points normalize the flag _and_ gate on it with the **same** boolean before passing it down: `content.ts:161-171`, `176-185`, `241-264`. `createPublicCollectionReader` (categories/tags) hardcodes `draft: false` (`content.ts:207`, `218`) → `overrideAccess: false`. The only caller passing `draft: true` anywhere in the repo is `preview-document.ts:48`, which supplies the URL `secret` as `previewToken`, validated by `assertAuthorizedDraftAccess` (`content.ts:111-124`: env present, ≥32 chars, `timingSafeEqual` over SHA-256). Neither `cachedRead`, the six routes, `sitemap.ts`, nor `/api/e2e` can reach a draft read. **No bypass found.** The diagnosis in the comment is also correct: `publishedOrAuthenticated` (`roleAccess.ts:52-58`) would re-filter an anonymous draft read to published-only.

But the fix breaks the Sprint 1 seam it sits inside. `content-client.ts:68` and `:81` return `accessEnforced: true` _unconditionally_ — including when access control was just switched off. `types.ts:38-48` documents that literal as "the adapter explicitly asserts that it applied access control (e.g. Payload's `overrideAccess: false`)", and `assertAccessEnforced` (`content.ts:82-88`) exists to catch a lying adapter. For the one path that can surface unpublished content, that guard is now vacuous: the invariant rests entirely on three hand-written `if (draft) assertAuthorizedDraftAccess(...)` lines with no compile-time or runtime backstop. A future reader added to `content.ts` that forgets the gate inherits `overrideAccess: true` silently. Also, `overrideAccess: true` disables _field_-level access, so a draft preview populates `users` (see NB3). **Non-blocking, but harden before Sprint 3B**: split the contract into `accessEnforced` (honest) + a `draftAuthorized: true` literal that only web-core's gate can mint.

## Item 3 — `/api/e2e` gating: **genuinely inert**

`route.ts:23-29` requires all three of `E2E_TEST_MODE === "true"` (module-load const), a non-empty `E2E_TEST_SECRET`, and a matching `x-e2e-secret` header; `authorized()` runs before `request.json()`. With the mode flag unset it 404s regardless of the secret, and vice versa. Grep confirms `E2E_TEST_MODE` is set in exactly two places — `playwright.config.ts:44` and `ci.yml:84` (the e2e _step_, not the `pnpm build` step at `ci.yml:74`, so no build-time inlining risk). Never in `.env.example`. No way in without both gates.

---

## BLOCKING

**B1 — GTM (plan §2.4) is entirely absent.** Zero implementation: no loader, no `dataLayer` interface, no consent gate, no test. `grep -ri "gtm|googletagmanager|dataLayer|consent"` across all source returns **only** doc files. Nothing in `(frontend)/layout.tsx`. This is in-scope §2.4, not deferred by §4. → **criterion 9 FAIL**.

**B2 — SEO-120 (SEO permissions / per-customer module enablement) is entirely absent.** No permission field, no `access` on the `seo` group, no enablement flag in `BuildNeroConfigOptions` (`buildNeroConfig.ts:20-51`). Any editor can edit any SEO field. → **criterion 7 FAIL**.

**B3 — Draft slugs leak publicly via the `redirects` collection.** `publishLifecycleHooks.ts:81-97` computes `slugChanged` from `operation === "update"` only — it never checks `doc._status`. Renaming the slug of a **never-published draft** therefore calls `upsertRedirect`, writing a row into `redirects`, which is `read: readAny` (`Redirects.ts:27`) and exposed at `/api/redirects` (the proxy matcher excludes `api`, `proxy.ts:81`). An anonymous `GET /api/redirects?limit=1000` enumerates the old _and_ new slugs of unpublished documents — e.g. `/secret-acquisition → /project-x`. Journey 2 does not catch this (it checks `/`, `/{slug}` and the sitemap, not `/api/redirects`). Fix: gate the redirect write on `doc._status === "published"`.

**B4 — Criterion 8's redirect _serving_ has no test at all.** `proxy.ts` has zero test coverage anywhere in the repo. `publishLifecycleHooks.test.ts` only proves the hook writes a row. The 302/307/410/451 branches (`proxy.ts:64-74`) and the `REDIRECT_STATUS` mapping are entirely unexercised, and no E2E journey visits a renamed URL. The criterion says "Proven by tests."

**B5 — Criterion 5's published stop-condition has no test.** `SlugField.tsx` has **no** component test; `slugField.test.ts` only covers field shape and the `beforeValidate` API fallback. E2E 02 covers manual-edit only. The stop condition §7 calls out as the higher risk — `lockedRef.current = initialStatus === "published"` (`SlugField.tsx:44`) plus the `statusValue` effect (`:50-52`) — is verified by manual browser inspection alone. Both mechanisms read `useFormFields(([fields]) => fields._status?...)`; if Payload ever omits `_status` from form state on a published doc, both silently fail open and live URLs shift. Criterion says "Proven by a test."

---

## NON-BLOCKING

- **NB1 — `proxy.ts:26-35` is a second public content read path, outside web-core, with `overrideAccess: true`.** Plan §3: "web-core remains the only public content read path." `overrideAccess: true` is also gratuitous (`read: readAny` already permits it) and will silently bypass any future tightening of `redirects` read access.
- **NB2 — uncached DB query on every public request.** `findRedirect` runs before every non-excluded path, including `/public` static assets (matcher excludes only `_next/static`/`_next/image`). One Postgres round-trip per image request; trivially amplifiable.
- **NB3 — `authorName()` returns the author's _email_ as JSON-LD `author.name`** (`blog/[slug]/page.tsx:50-61, 106`). Inert today only because `Users.read = isAdminOrSelf` (`Users.ts:13`) prevents relationship population under `overrideAccess: false` — so the side effect is that `BlogPosting.author` is _always_ absent publicly. It becomes a live PII leak the moment `Users` read access widens or a caller passes `overrideAccess: true`. Use a display-name field.
- **NB4 — SEO-103 breadcrumbs ignore `primaryCategory`.** `blog/[slug]/page.tsx:87-91` hardcodes Home › Blog › Title, while `Articles.ts` describes `primaryCategory` as "used for its URL and breadcrumbs." Field description overstates the code.
- **NB5 — architecture boundaries are not lint-enforced**, contradicting plan §3 ("remain lint-enforced"). No `no-restricted-imports` / boundary plugin anywhere (`tooling/eslint/base.js`, all four package configs). I verified item 6 **manually and it is clean**: `packages/ui/src` imports nothing from `@nero/*`; `packages/web-core/src` imports no `payload`/`@payloadcms/*`; `cms-core` has no customer-name branching (only pre-existing TUYBA-flavored block fixture copy, explicitly deferred as SPRINT-02-REVIEW NB5). But this is convention, not enforcement — and the sprint added a _new_ dependency direction (`cms-core → @nero/web-core/cache`, `cms-core → @payloadcms/ui` peer) that the documented rules don't cover either way.
- **NB6 — category/tag page caches are never invalidated.** `cacheAndRedirects` is wired only for `SCHEDULABLE_COLLECTIONS` (`buildNeroConfig.ts:97`), so `nero-content:en:categories`/`:tags` (`category/[slug]/page.tsx:35`, `tag/[slug]/page.tsx:32`) have no producer. A renamed or deleted category keeps serving 200 for up to `revalidate: 60`.
- **NB7 — E2E journey 4 tests the wrong thing.** `05-scheduled-content-hidden.spec.ts:19` uses `Date.now() - 60_000` — a _past_ date. The fixture is just a plain draft, so the "before" assertion duplicates journey 2 and `enforceScheduledPublish` (the future-dated branch) is never exercised in E2E. The `results.some(r => r.collection === "pages")` assertion (`:32`) doesn't pin the specific doc. Plan §2.5 journey 4 says "a future-dated document." Unit coverage exists in `scheduled-publish.integration.test.ts`.
- **NB8 — E2E smoke asserts `consoleErrors === []` on `/admin`** (`06-smoke.spec.ts:5, 21`) plus `waitForLoadState("networkidle")`. Any Payload dev-warning or a single failed asset fetch reddens CI; this is the classic rot vector §7 warns about.
- **NB9 — journey 3 silently skips without `PREVIEW_SECRET`** (`04-...spec.ts:12`). Safe in CI (`ci.yml:16` sets it job-wide), but a required security journey no-ops locally with no failure.
- **NB10 — `/api/e2e` fingerprinting + non-constant-time compare.** `route.ts:28` uses `===`; `:33` returns a JSON 404 body, distinguishable from Next's HTML 404, so the route's existence is discoverable. Low risk given both gates.
- **NB11 — redirect chains accumulate.** `publishLifecycleHooks.test.ts:107` explicitly encodes "adds a new hop" — after two renames a visitor takes `/old → /mid → /final`. Two browser round-trips and an SEO demerit; consider collapsing chains on upsert.
- **NB12 — no tests for `sitemap.ts` or `seo.ts`.** `buildMetadata`'s canonical/robots/OG logic (`seo.ts:30-63`) and the sitemap's `isNoindex` exclusion are covered only indirectly by one E2E `not.toContain(slug)` assertion.

---

## Honest completeness: SEO / GTM / cache tags

| ID / area                                         | Status                 | Evidence                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SEO-101 per-doc title+desc, content-type defaults | **PARTIAL**            | `fields/seo.ts:30-47`, `seo.ts:33-34`, tested in `seoFields.test.ts`. "Dynamic templates" is one hardcoded `` `${title} \| ${SITE_NAME}` `` in the _app_, not a configurable template. No test of `buildMetadata`.                                                                                                                         |
| SEO-102 canonical, robots, OG/Twitter             | **PARTIAL**            | `seo.ts:35-61` implemented and wired on all 4 route types. **"Search snippet preview" absent** — no admin preview component exists. No test.                                                                                                                                                                                               |
| SEO-103 primary category + breadcrumbs            | **PARTIAL**            | `Breadcrumbs.tsx`, `breadcrumbSchema` (`seo.ts:71-82`) on all routes. **Primary category is not used in any breadcrumb trail** (NB4).                                                                                                                                                                                                      |
| SEO-107 XML sitemap                               | **PARTIAL**            | `sitemap.ts` works; drafts/scheduled excluded via web-core default (proven by E2E 03). **No content-type or taxonomy inclusion/exclusion config** — only per-document `noindex`, and categories/tags can't be excluded at all. No unit test.                                                                                               |
| SEO-109 redirect manager                          | **PARTIAL**            | `Redirects.ts` (all 5 types, validated), `proxy.ts:26-77`, auto slug redirects in `publishLifecycleHooks.ts` with 6 unit tests. **Serving untested (B4); draft-slug leak (B3).**                                                                                                                                                           |
| SEO-112 schema presets                            | **PARTIAL**            | Article/BlogPosting, BreadcrumbList, Organization, WebSite all present (`seo.ts:71-129`) and rendered. **"Local structural validation" entirely absent** — nothing validates the emitted JSON-LD. `author` never populates (NB3).                                                                                                          |
| SEO-120 permissions / module enablement           | **ABSENT**             | B2                                                                                                                                                                                                                                                                                                                                         |
| GTM (plan §2.4)                                   | **ABSENT**             | B1 — zero code                                                                                                                                                                                                                                                                                                                             |
| Cache tags (plan §3, criterion 11)                | **SUBSTANTIALLY DONE** | Producer `publishLifecycleHooks.ts:75-113` + `invalidate-cache-tags.ts`; consumer `cached-content.ts` on 6 reads; slug change invalidates both tags, tested (`publishLifecycleHooks.test.ts:41-86`). Gaps: unit-level only (no E2E), taxonomy tags have no producer (NB6), cross-process invalidation honestly documented as out of scope. |

Sections 1–3 (public routes, E2E, editor experience) are **substantially complete and real**, not stubs. The coder also cleared SPRINT-02-REVIEW's deferred NB2 (`BlockErrorBoundary.tsx` + 5 tests). Sections 4–6 are where the turn limit landed: SEO is broad-but-shallow, GTM never started.

## Acceptance criteria

| #   | Verdict                  | Evidence                                                                                                                                                                                                                                                                                |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **PARTIAL**              | lint/typecheck/test/format:check all exit 0 (verified above). `pnpm build` not run by me — unverified.                                                                                                                                                                                  |
| 2   | **UNVERIFIED**           | `ci.yml:76-93` adds the e2e job correctly; no CI run observed.                                                                                                                                                                                                                          |
| 3   | **PASS**                 | `[slug]/page.tsx:67-91`, `blog/[slug]/page.tsx:78-116`, `blog/page.tsx:38-79`, `category/[slug]/page.tsx`, `tag/[slug]/page.tsx`; blocks via `renderBlocks`; E2E 01 proves 200 + block content.                                                                                         |
| 4   | **PARTIAL**              | Unpublished/nonexistent: PASS (`content.ts:126-134`; E2E 03 covers URL + `/` listing + sitemap; orchestrator confirmed non-vacuous). Scheduled-but-not-due: enforced (`enforceScheduledPublish.ts`) but **E2E 05 uses a past date, so the future-dated path is untested in E2E** (NB7). |
| 5   | **PARTIAL**              | Auto-fill + editable + manual-edit stop: PASS (`SlugField.tsx:50-77`, E2E 01:27-31, E2E 02). **Published stop condition has no test** (B5).                                                                                                                                             |
| 6   | **PASS**                 | Sidebar carries slug (`slugField.ts:36`), publishAt (`publishAt.ts:13`), coverImage/author/primaryCategory/additionalCategories/tags (`Articles.ts` diff); SEO in a collapsed group; editor-facing descriptions throughout. Orchestrator confirmed visually.                            |
| 7   | **FAIL**                 | SEO-120 absent; SEO-102 snippet preview and SEO-112 validation absent; no test evidence for 102/107/112 (table above).                                                                                                                                                                  |
| 8   | **PARTIAL**              | Creation proven (`publishLifecycleHooks.test.ts:88-105`); serving of 301/302/307/410/451 wholly untested (B4).                                                                                                                                                                          |
| 9   | **FAIL**                 | B1 — nothing implemented.                                                                                                                                                                                                                                                               |
| 10  | **PARTIAL / UNVERIFIED** | All six journeys exist and seed via the local API through the gated route (`helpers.ts`, `/api/e2e`) per §7. Orchestrator confirmed they catch regressions. Gaps: NB7, NB8, NB9. Not run by me.                                                                                         |
| 11  | **PASS (unit)**          | `publishLifecycleHooks.test.ts:41-86` + `payload.config.ts:56-60` wiring; caveat NB6.                                                                                                                                                                                                   |

---

## Verdict

**Not ready to close Sprint 3A.** The `overrideAccess` question — the one flagged as must-be-sound-or-blocking — is **sound**; no path reaches a draft read without the preview-token gate, and the Payload adapter is still unexported. Web-core remains the read path for pages/articles/taxonomy, with one new exception (`proxy.ts`, NB1). Sections 1–3 are real, working, and meaningfully tested.

Five blockers stand: **GTM is entirely missing (B1)** and **SEO-120 entirely missing (B2)** — both in-scope, both making criteria 9 and 7 fail outright; **draft slugs leak through the public `redirects` API (B3)**, a genuine unpublished-content disclosure on the new public surface with a one-line fix; and two "proven by a test" criteria that aren't (**B4** redirect serving, **B5** the published slug-lock — the exact condition plan §7 names as the higher-consequence one). Fix B3 first: it is a live leak, not a coverage gap. B1/B2 are honest scope overflow from the turn limit and should be split into a follow-up rather than quietly re-labelled as done — the completeness table above is the record of what actually landed.

---

# Round 1 follow-up — orchestrator

## Context: the coder hit its turn limit

Sprint 3A was planned as six sections. The coder completed sections 1-3 and part
of 4 before exhausting its turn budget. Rather than relabel the remainder as
done, the gap is recorded here and carried into Sprint 3B. The reviewer's
completeness table above is the authoritative record of what landed.

## Item 2 — the `overrideAccess` question: resolved as SOUND

The review traced every draft-capable path and found no bypass: the adapter is
module-private, all four entry points gate on the same boolean, the taxonomy
reader hardcodes `draft: false`, and the only `draft: true` caller supplies the
preview token. The seam degradation the reviewer flags (the `accessEnforced`
literal is now unconditional on the draft path) is real but non-blocking, and is
carried forward as a hardening item.

## BLOCKING — resolved

**B3 — draft slugs leaked through the public redirects API.** The most serious
finding and a live disclosure, not a coverage gap. Renaming the slug of a
never-published draft wrote a `redirects` row, and `redirects` is publicly
readable — so an anonymous caller could enumerate the old and new slugs of
unpublished work.

Fixed in `packages/cms-core/src/publishing/publishLifecycleHooks.ts`: every
redirect write is now gated on publication status. A redirect is created only
when the document is, or was, published — an unpublished draft has no live URL
worth redirecting. Stale-redirect cleanup is likewise gated, so a draft cannot
delete a redirect shadowing a path it does not own. Cache-tag invalidation still
runs for drafts, since that is not publicly observable.

Covered by four new tests in `publishLifecycleHooks.test.ts`. Proven
non-vacuous: reverting the two gate conditions failed exactly the two
draft-privacy tests; restoring returned 64/64 green.

**B4 — redirect serving had no test.** Added
`apps/tuyba/e2e/08-redirects-serve.spec.ts`: a renamed published page's old URL
resolves to the new one, 302 and 307 produce the correct status on the redirect
hop, and 410/451 respond directly with no destination.

**B5 — the published slug-lock had no test.** Added
`apps/tuyba/e2e/07-slug-locks-after-publish.spec.ts`, covering the higher-
consequence stop condition the plan's risk section names: after publication,
rewording the title must not move the slug, and the lock must survive a reload
of the published document.

Both proven non-vacuous together: disabling the `SlugField` published lock and
short-circuiting `findRedirect` turned 4 E2E tests red; restoring both returned
14/14 green.

**B1 (GTM) and B2 (SEO-120) — deferred, not fixed.** Both are genuine scope
overflow from the turn limit. Neither is half-built: GTM has no code at all, and
SEO-120 has no permission model. They move to Sprint 3B as explicit scope rather
than being quietly marked complete. Acceptance criteria 7 and 9 remain FAIL for
Sprint 3A and are the first items of the next sprint.

## NON-BLOCKING addressed

- **NB1** — `proxy.ts`'s redirect lookup now uses `overrideAccess: false`. It
  changes nothing today (`redirects` is publicly readable) but means a future
  tightening of that access rule is honored rather than silently bypassed on the
  public request path.
- **NB7** — E2E journey 4 tested only a past-dated document, never exercising
  `enforceScheduledPublish`'s future-dated branch. Added a test that asks to
  publish a document dated a week out and asserts the hook forces it back to
  draft, the public route 404s, the scheduler declines to publish it, and it is
  absent from the sitemap.

## Deferred to Sprint 3B with the reason

| Item                                               | Why deferred                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| B1 GTM plumbing                                    | Turn-limit overflow; first item of Sprint 3B                                    |
| B2 SEO-120 permissions                             | Turn-limit overflow; first item of Sprint 3B                                    |
| `accessEnforced` / `draftAuthorized` split         | Hardening of a sound-but-weakened seam; no live exposure                        |
| NB2 uncached redirect lookup per request           | Performance, not correctness; needs the caching work in 3B                      |
| NB3 author email in JSON-LD                        | Inert today (relationship never populates publicly); needs a display-name field |
| NB4 breadcrumbs ignore `primaryCategory`           | SEO-103 completion, grouped with the 3B SEO work                                |
| NB5 boundaries not lint-enforced                   | Verified clean manually; enforcement belongs with the 3B tooling pass           |
| NB6 taxonomy cache tags have no producer           | Grouped with the cache work in 3B                                               |
| NB8 smoke test asserts zero console errors         | Known rot vector; revisit if it flakes                                          |
| NB9 preview journey skips without `PREVIEW_SECRET` | Safe in CI, which sets it job-wide                                              |
| NB10-12                                            | Low-risk polish                                                                 |

## Final verification (orchestrator)

- `pnpm lint` — 0 errors/warnings
- `pnpm typecheck` — 0 errors
- `pnpm format:check` — clean
- `pnpm test` — 125 unit/integration tests green (cms-core 64, web-core 33,
  ui 12, tuyba 16 + 3 DB-backed), against real PostgreSQL
- `pnpm build` — compiled successfully, no database required
- `pnpm --filter @nero/tuyba run e2e` — **14 passed** against a real production
  build and real PostgreSQL

Sprint 3A closes with sections 1-3 complete and section 4 partial. GTM and
SEO-120 open into Sprint 3B.
