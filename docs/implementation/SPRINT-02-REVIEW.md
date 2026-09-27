# Sprint 2 — Independent Review (round 1)

Reviewer: Claude Opus, against commit ee8380b.

# Sprint 2 Review — NERO CMS

Commands run: `pnpm lint` ✅, `pnpm typecheck` ✅, `pnpm test` ✅ (web-core, cms-core 31, ui 12, tuyba 15 passed / 3 DB-gated skipped locally), `pnpm format:check` ✅. `pnpm build`/docker not run per instructions.

---

## BLOCKING

### B1 — The scheduler's advisory lock leaks; scheduled publishing can silently stop forever

`packages/cms-core/src/publishing/scheduledPublish.ts:41-58`

`payload.db.pool` is a `pg.Pool` (confirmed: `@payloadcms/db-postgres/dist/types.d.ts:81 → pool: Pool`). `pool.query()` checks out an **arbitrary** client per call. `pg_try_advisory_lock` is _session_-scoped, so:

- line 44 acquires the lock on connection A;
- line 56's `pg_advisory_unlock` may execute on connection B. Postgres then emits a WARNING and returns `false` — **no exception is thrown** — and connection A keeps holding the lock until its socket closes.

In any long-lived process (the Next server, a worker calling this in-process, a pool with >1 live client), the next run that draws a different client sees `locked === false`, logs `"another run holds the scheduler lock, skipping"`, and returns `[]`. Scheduled content then never publishes, with a benign-looking info log as the only symptom. The unlock's return value is never checked, so nothing surfaces this.

The integration test passes because a sequential, single-run script reuses the one idle client — it does not exercise the failure mode, and nothing in the suite exercises concurrency at all. Since SPRINT-02 §2.6 and §7 make multi-replica safety an explicit deliverable, the one artifact of that requirement being unsound is blocking.

Fix: `const client = await pool.connect()`; run lock, work and unlock on that client; `client.release()` in `finally`; assert the unlock returned `true`.

### B2 — Acceptance criterion 11 has no recorded result

Nothing in `ee8380b` records the manual admin rich-text confirmation. It was already left open twice in Sprint 1 (`docs/implementation/SPRINT-01-REVIEW.md:202,231`). Criterion 11 explicitly says "Confirm against a running admin and record the result." Not done.

---

## NON-BLOCKING

1. **`docs/EDITORIAL.md:79-92` states something that is not true today.** It tells editors scheduled content publishes automatically and "You do not need to be online," while `docs/DEPLOYMENT.md:134-143` honestly records that _no_ cron/worker invokes `scheduler:run`. EDITORIAL.md is the artifact the Phase 2 editor gate runs against; an editor following it will schedule content that never goes live. Reword to say scheduling requires the job to be wired (or wire it).

2. **`renderBlocks`' try/catch only guards element _creation_, not React's render.** `packages/web-core/src/blocks/renderBlocks.ts:40-41` catches throws from calling the registry function; a throw inside a `@nero/ui` component body happens later, during React's render, and escapes to the route — 500ing the whole page, which is exactly what §2.4 forbids. Mitigated in practice because `apps/tuyba/src/lib/blocks-registry.tsx` coerces all data eagerly, but the doc comment at `renderBlocks.ts:9-18` claims more than the code delivers. Add a per-block error boundary, or narrow the comment.

3. **`PREVIEW_SECRET` is a long-lived shared secret in a query string with no `Referrer-Policy`.** `apps/tuyba/src/payload.config.ts:43-48` puts it in the URL; `apps/tuyba/src/proxy.ts:13-14` sets `Cache-Control` and `X-Robots-Tag` but not `Referrer-Policy`. Any external image or link in previewed rich text leaks the full URL — secret included — in the `Referer` header, granting permanent draft access to anyone who sees it. Add `Referrer-Policy: no-referrer` (cheap), and consider a short-lived per-document token later.

4. **`validateSafeHref` is bypassable, though not currently exploitable.** `packages/cms-core/src/blocks/shared.ts:12-14` tests the scheme only after `trim()`, so `java\tscript:alert(1)` or a leading `\x01` passes. I verified the two downstream defenses hold: React 19 replaces `javascript:` hrefs with a throwing stub (including the tab variant), and Payload's `convertLexicalToHTML` rewrites `javascript:` link URLs to `#` and escapes attribute values. So no XSS today — but the field-level backstop is weaker than its comment claims. Strip control characters before testing, or allowlist `^(/|#|https?:|mailto:|tel:)`.

5. **cms-core fixtures ship TUYBA copy**: `blocks/callout.ts:38`, `cta.ts:34`, `hero.ts:45-46`, `contentCards.ts:33-45`, `faq.ts:33-39`. Not a branch on a customer name, so not a rule violation, but customer content in the reusable package is the wrong direction.

6. **The heading-level test is weak.** `packages/cms-core/src/__tests__/blocks.test.ts:47-55` asserts no field is _named_ `headingLevel` — it would pass for a field named `level`. The constraint is genuinely real in the schemas (no block exposes any heading input; `Hero.tsx:12` hardcodes `<h2>`, `Cta.tsx:19` `<h2>`, `ContentCards.tsx:24` `<h3>`), but the test doesn't prove it.

7. **Blocks render only on `/preview`.** No public route consumes `layout` (`apps/tuyba/src/app/(frontend)/page.tsx` still lists titles only). Defensible under §4, but the renderer has no public-path coverage.

8. **Stale comment**: `apps/tuyba/src/app/preview/page.tsx:23` references `middleware.ts`; the file is `apps/tuyba/src/proxy.ts`.

9. **`preview-document.ts:49` swallows every draft-read error**, including a misconfigured `PREVIEW_SECRET` or a DB failure. Preview then silently degrades to published content with no signal. Log the swallowed error.

---

## Verified sound (no action)

- **Adapter still unexported.** `apps/tuyba/src/lib/content-client.ts` exports only the composed `contentClient`; `payloadQueryClient` is module-private.
- **No second read path.** The only `payload.find` on a read path is inside the adapter; the scheduler's `overrideAccess: true` calls are writes plus the internal due-query, never a public read.
- **Preview token handling is correct** for all three cases: no token, empty string (falsy → skipped), wrong token (web-core throws → caught → published-only fallback). Timing-safe comparison and the ≥32-char secret floor from Sprint 1 are intact (`packages/web-core/src/content.ts:60-84`).
- **`enforceScheduledPublish` is not bypassable via the API.** Payload's `createPayloadRequest` initializes `context: {}` and never reads it from the request body/query, so `allowScheduledPublish` cannot be injected over REST/GraphQL. `restoreVersion` _does_ run collection `beforeChange` hooks (`payload/dist/collections/operations/restoreVersion.js:162-177`), so restore isn't a hole either.
- **Boundaries hold.** `packages/ui` imports no `@nero/*`, no `payload`, no db client. `web-core` imports only `node:crypto` and React _types_. No customer-name branching in shared packages.
- **Test honesty is above average.** `packages/web-core/src/__tests__/content.test.ts:40-66` uses a fake client that actually evaluates the `where` clause, so the draft-exclusion tests are real, not shape assertions. The DB-gated tests are not silently skipped where it matters: `.github/workflows/ci.yml:12-16` sets `DATABASE_URI` at workflow scope with a postgres service at `:22-34`, so CI runs them; locally the skip is visible in the summary.

---

## Acceptance criteria

| #   | Criterion                                                                            | Verdict     | Evidence                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | lint/typecheck/test/format/build exit zero                                           | **PARTIAL** | First four run and pass here. `build` not run per my instructions; a prior `.next` output contains `/preview`, so it has built at some point.                                                                                                                                                                  |
| 2   | CI passes incl. type-gen + DB smoke                                                  | **PARTIAL** | `ci.yml:53-76` wires every step correctly; I cannot execute the workflow.                                                                                                                                                                                                                                      |
| 3   | Articles/Categories/Tags with draft/publish versions + Sprint 1 access model, tested | **PARTIAL** | `Articles.ts:12-24` has versions + `publishedOrAuthenticated`; proven in `articles-taxonomy.integration.test.ts:44-73`. But `Categories.ts` / `Tags.ts` have **no `versions`** and use `readAny` — the criterion's literal wording isn't met (defensible for taxonomy; call it out explicitly if intentional). |
| 4   | Eight blocks, stable slugs, typed schemas, fixtures; test asserts fixture+renderer   | **PASS**    | `blocks/index.ts:41-70`; `blocks.test.ts:5-45`; `blocks-registry.test.ts:7-22`.                                                                                                                                                                                                                                |
| 5   | Unknown block skipped with warning, not thrown                                       | **PASS**    | `renderBlocks.ts:31-37`; `renderBlocks.test.ts:19-36`; `blocks-registry.test.ts:25-31`. (See NB2 for the render-time caveat.)                                                                                                                                                                                  |
| 6   | Scheduled-but-not-due doc absent from published reads                                | **PASS**    | `scheduled-publish.integration.test.ts:28-66`, real PostgreSQL.                                                                                                                                                                                                                                                |
| 7   | Restored version becomes served content                                              | **PASS**    | `restore.integration.test.ts:23-58`, real PostgreSQL.                                                                                                                                                                                                                                                          |
| 8   | Preview returns draft only with valid token                                          | **PASS**    | `preview-document.ts:44-60`; `preview-document.test.ts:28-77` covers valid/wrong/absent.                                                                                                                                                                                                                       |
| 9   | Preview noindex + not publicly cacheable                                             | **PASS**    | `proxy.ts:11-18`, `next.config.mjs:10-19`, `preview/page.tsx:27-29`. No `Referrer-Policy` (NB3); no automated header test.                                                                                                                                                                                     |
| 10  | `docs/EDITORIAL.md` covers blocks/drafts/preview/scheduling/restore                  | **PASS**    | All six sections present. §4 overstates automation (NB1).                                                                                                                                                                                                                                                      |
| 11  | Manual admin rich-text check confirmed and recorded                                  | **FAIL**    | No record in the commit or docs; open since Sprint 1.                                                                                                                                                                                                                                                          |

---

## Verdict

**Sprint 2 cannot close yet** — but it is close, and the work is of noticeably higher quality than Sprint 1's first pass. The security seams held: no new read path bypasses `web-core`, the adapter stays private, the preview gate behaves correctly on all three token cases, and the two XSS vectors I probed (block `href`, Lexical link URLs) are genuinely defended downstream.

Three things gate closure: **fix B1** (small, localized — `pool.connect()` instead of `pool.query()`), **correct `EDITORIAL.md` §4** so it doesn't promise automation that isn't wired, and **perform and record criterion 11**. Also decide and state whether the taxonomy collections intentionally lack versions (criterion 3). Everything in the NON-BLOCKING list can be deferred, though NB3 (`Referrer-Policy: no-referrer`) is a one-line change worth taking now.

---

# Round 1 follow-up — orchestrator

All findings the review gated closure on were addressed.

## BLOCKING

**B1 — advisory lock leaked across pooled connections.** Confirmed by reading
the code: `pg_try_advisory_lock` is session-scoped, but the lock was taken and
released through `pool.query()`, which hands out an arbitrary client per call.
The unlock could land on a different connection, return `false` without
throwing, and leave the original connection holding the lock — after which
every run would log "another run holds the scheduler lock" and publish nothing.

Fixed in `packages/cms-core/src/publishing/scheduledPublish.ts`: the lock is
acquired, held and released on one `pool.connect()` client, released in a
`finally`, and a non-`true` unlock result is logged as an error rather than
ignored. `packages/cms-core/src/__tests__/scheduledPublishLock.test.ts` pins the
contract with six tests, including one asserting the pool's own `query` is never
used for lock statements. Proven non-vacuous: reverting to the pooled-query
behavior failed 4 of the 6 tests; restoring the fix returned 42/42 green.

**B2 — acceptance criterion 11 unrecorded.** Performed and recorded below.

## Acceptance criterion 11 — manual admin verification (performed)

Booted `apps/tuyba` against the compose PostgreSQL database and drove the admin
UI directly. Observed:

- Admin dashboard renders with all six collections (Users, Media, Pages,
  Articles, Categories, Tags).
- The `content` rich-text field on Pages renders as an interactive Lexical
  editor and accepts typed input — verified by typing into it and reading the
  resulting editor content back out of the DOM.
- The `layout` blocks field's "Add Layout" picker opens and lists all eight
  catalog blocks with their editor labels: Hero, Rich Text, Image + Text,
  Gallery, Callout, Content Cards, FAQ, Call to Action.

The import map generated in Sprint 1 is therefore correct in practice, closing
the item that had been open since Sprint 1. `apps/tuyba/scripts/admin-check-setup.ts`
is the local-only helper used to seed a throwaway admin for this check.

## NON-BLOCKING addressed in this pass

- NB1: `docs/EDITORIAL.md` section 4 no longer promises automatic scheduled
  publishing. It states explicitly that the job is not yet wired to a scheduler
  and tells editors to confirm with a developer before relying on it.
- NB3: `Referrer-Policy: no-referrer` added to `/preview` in both
  `apps/tuyba/src/proxy.ts` and `apps/tuyba/next.config.mjs`, so the preview
  secret in the query string cannot leak through the `Referer` header.
- NB4: `validateSafeHref` rewritten from a scheme denylist to an allowlist,
  stripping ASCII control characters and whitespace before matching so
  `java\tscript:` and similar obfuscations cannot pass. Covered by
  `packages/cms-core/src/__tests__/safeHref.test.ts` (5 tests).
- NB8: stale `middleware.ts` reference in `apps/tuyba/src/app/preview/page.tsx`
  corrected to `proxy.ts`.
- NB9: `preview-document.ts` now logs the swallowed draft-read error instead of
  discarding it silently, so a misconfigured `PREVIEW_SECRET` is diagnosable.

## Criterion 3 — taxonomy versions, decided

Categories and Tags intentionally have no draft/publish lifecycle and are
publicly readable. Taxonomy terms are navigational labels, not editorial
documents: they hold no draft state worth protecting, an article referencing an
unpublished term would render a broken link, and versioning them would make the
primary-category relation depend on two independent publication states. The
rationale is now recorded in the collection files themselves.

## Deferred to a later sprint

- NB2: `renderBlocks` guards element creation but not React's render phase. A
  per-block error boundary belongs with the public rendering work in Sprint 3A,
  where blocks first reach a public route.
- NB5: fixtures in `cms-core` carry TUYBA-flavored copy. Should become neutral
  sample content when a second consumer site exists.
- NB6: the heading-level test asserts no field is named `headingLevel`. The
  constraint is real in the schemas and components, but the test could be
  strengthened to assert the rendered heading tags.
- NB7: blocks render only on `/preview`; public-route coverage arrives in
  Sprint 3A.

## Final verification (orchestrator)

- `pnpm lint` — 0 errors/warnings
- `pnpm typecheck` — 0 errors
- `pnpm format:check` — clean
- `pnpm test` — 95 tests green (tuyba 18 incl. 3 DB-backed, web-core 23,
  cms-core 42, ui 12), run against real PostgreSQL
- `pnpm build` — compiled successfully, no database required

Sprint 2 is closed. The PRD Phase 2 exit gate that requires two
WordPress-experienced editors to complete authoring tasks remains pending and
needs real editors; it is not something the implementation can self-certify.
