# Sprint 1 — Independent Review (round 1)

Reviewer: Claude Opus. Status: BLOCKING issues open; fixes tracked in this sprint.

I read the three contract documents, reviewed every committed file, verified the boundary claims by reading imports, traced the security-relevant code paths into `node_modules` to confirm runtime semantics, and ran the full command set both in place and in a fresh `git clone` (since deleted; the repo is unmodified).

---

# BLOCKING

### B1 — "Published-only default" is not enforced anywhere; the public homepage lists unpublished drafts

This is the headline finding. Three things are true at once:

1. `apps/tuyba/src/lib/content-client.ts:13` calls `payload.find()` **without `overrideAccess: false`**. Payload's local API defaults to `overrideAccess = true` (`payload/dist/collections/operations/local/find.js:5`). `git grep overrideAccess -- apps packages tooling` returns nothing. So `Pages.access.read = publishedOrAuthenticated` **never executes** on the public route.
2. `draft: false` does not mean "published only" in Payload. In `payload/dist/collections/operations/find.js:103-145`, the `draftsEnabled` branch is the _only_ one that touches versions; the `else` branch calls `payload.db.find` with no `_status` constraint. Draft-status rows live in the main `pages` table, so they are returned.
3. `packages/web-core/src/content.ts:24-43` never adds a `_status` filter — it only forwards `draft: false`.

Net effect: an editor creates a page, hits "Save draft", and it immediately appears on `/`. This violates SPRINT-01 §3 ("Public content helpers in `web-core` must default to published-only reads"), PRD §8 ("Public content access explicitly enforces publication status **even when in-process APIs can bypass default access controls**" — that sentence describes exactly this bug), and ENGINEERING-RULES.

**The tests do not catch it.** `packages/web-core/src/__tests__/content.test.ts:13-37` asserts only that `{ draft: false }` was forwarded to a `vi.fn()` mock. They assert the wrong invariant, so they pass green while production leaks drafts.

Fix direction (do both):

- In `web-core`, merge `_status: { equals: "published" }` into `where` whenever `draft !== true`, and assert the emitted `where` in the test — not just the `draft` flag.
- Add `overrideAccess` to `FindArgs`/`FindByIdArgs` and have the adapter pass `overrideAccess: false` so collection access control is actually the second line of defence.

The REST API (`/api/pages`) is fine — it defaults to `overrideAccess: false`, so `publishedOrAuthenticated` does apply there.

### B2 — Privilege escalation: any editor can make themselves an admin

`packages/cms-core/src/collections/Users.ts:15` sets `update: isAdminOrSelf`, and the `roles` field (lines 19-27) has **no field-level `access`**. Payload field access defaults to allow. An authenticated editor can `PATCH /api/users/<their-own-id>` with `{"roles":["admin"]}` and gain full admin, including `delete` on every collection. `saveToJWT: true` then propagates it.

Fix: `access: { create: isAdmin, update: isAdmin }` on the `roles` field.

### B3 — The Docker image ships the developer's `.env`, including `PAYLOAD_SECRET`

Two independent gaps compound:

- `.dockerignore:6-7` uses `.env` / `.env.*`. `.dockerignore` patterns are anchored to the context root, so these match only `/.env` — **`apps/tuyba/.env` is not excluded**. I verified this empirically with a throwaway `docker build`: `LEAK: apps/tuyba/.env IS in build context`. (Note they got this right for `node_modules` and `.next` using `**/`.)
- Next.js copies the app's `.env` into standalone output. Verified in this repo's existing build: `apps/tuyba/.next/standalone/apps/tuyba/.env` exists and contains `PAYLOAD_SECRET=local-dev-secret-change-me`. `Dockerfile:42` copies that whole tree into the runtime image.

Secondary effect: `NEXT_PUBLIC_SERVER_URL=http://localhost:3000` gets inlined into the client bundle at build time, so an image built on a dev machine bakes in a localhost URL.

Fix: `**/.env`, `**/.env.*`, `!**/.env.example` in `.dockerignore`.

### B4 — The Payload import map is an empty stub, so the Pages rich-text field won't render in the admin

`apps/tuyba/src/app/(payload)/admin/importMap.js:1` is `export const importMap = {};`. Nothing generates it:

- `generate:importmap` is a manual CLI command only (`payload/dist/bin/index.js:122`).
- `withPayload` never regenerates it — grep for `importMap` across `@payloadcms/next/dist/withPayload/` returns zero hits.

`@payloadcms/richtext-lexical` registers its admin components through the import map (`CellComponent: '@payloadcms/richtext-lexical/rsc#RscEntryLexicalCell'`, plus a `FieldComponent` and a `generateImportMap` hook). When a key is missing, `getFromImportMap` logs `PayloadComponent not found in importMap … You may need to run 'payload generate:importmap'` and returns `undefined` (`payload/dist/bin/generateImportMap/utilities/getFromImportMap.js:9`).

The admin shell itself will load (its own components are imported directly), but the `content` field on Pages — the only editorial field on the only content collection — will not. Per ENGINEERING-RULES, "a stub is not a working feature." One-command fix: run `pnpm --filter @nero/tuyba run generate:importmap` and commit the result. I could not boot the admin to confirm visually (no DB started), so confirm on the fix.

---

# NON-BLOCKING

### N1 — First-user flow can lock you out of ever creating an admin

`Users.roles` has `defaultValue: ["editor"]` and `create: isAdmin`. The create-first-user form renders the roles select with `editor` preselected. A developer following README:57 ("create your first admin user on first visit") who accepts the defaults ends up with an editor-only user and no UI path to create an admin. Recoverable only via SQL or the local API. Consider defaulting the first user to `admin`, or documenting the step explicitly. (The first-user creation itself does work — `registerFirstUserOperation` uses `overrideAccess: true`, so `create: isAdmin` is correctly bypassed.)

### N2 — CI has no `permissions:` block

`.github/workflows/ci.yml` never restricts `GITHUB_TOKEN`, so it inherits the repository default (frequently read/write). Add `permissions: { contents: read }` at workflow level.

### N3 — The CI PostgreSQL service is decorative

`.github/workflows/ci.yml:18-31` starts Postgres with a health check, and then **no step connects to it**. `pnpm test` covers three packages, none of which touch a database; `pnpm build` is deliberately DB-free. So S1-08's "disposable PostgreSQL service" and acceptance criterion 3 have zero CI coverage. Add at minimum a `payload generate:types` step plus a `getPayload({ config })` smoke check against the service.

### N4 — No `.gitattributes`; `pnpm format:check` fails on a Windows clone

Verified: a fresh `git clone` on this machine (`core.autocrlf=true`) checks files out with CRLF, and `pnpm format:check` then reports **"Code style issues found in 67 files"** and exits 1. The current working tree passes only because its files predate the clone. SPRINT-01 §7 lists Windows/Linux differences as a named risk. Add `.gitattributes` with `* text=auto eol=lf`, and add `format:check` to CI (it is a defined root script but absent from the workflow, so formatting drift is uncaught).

### N5 — The cache-tag contract is unreferenced and understates PRD §8

`packages/web-core/src/cache.ts:1-6` says the contract is "shared between content writers (revalidation hooks) and content readers (page renderers)". Neither exists: `git grep` finds no `revalidateTag`, no `unstable_cache`, no `cacheTag`, no Payload `hooks`, and `cacheTagsForPage` has no caller outside its own test. `(frontend)/page.tsx:6` is `force-dynamic`, so nothing is cached at all. Defining the naming scheme is a legitimate Sprint 1 deliverable — but the docstring should stop describing machinery that isn't there, and the tag shape has no locale or customer dimension, which PRD §8 requires ("Cache keys include required customer and locale boundaries"). Cheaper to add that dimension now than to migrate tag strings later.

### N6 — The Docker runtime cannot initialize a schema

`Dockerfile:35` sets `NODE_ENV=production`. The Postgres adapter auto-pushes schema **only** when `NODE_ENV !== 'production'` (`@payloadcms/db-postgres/dist/connect.js:109-111`). There is no `migrationDir`, no committed migrations, no `payload migrate` script, and `CMD` (line 48) runs `server.js` directly. First start against a fresh production database will fail. Deployment is out of Sprint 1 scope, but the Dockerfile is a deliverable — at minimum note this limitation in `docs/DEPLOYMENT.md`.

### N7 — The draft override has no authorization gate

`packages/web-core/src/content.ts:16` accepts `{ draft: true }` from any caller; nothing checks a preview token or session. SPRINT-01 §3 requires "an explicit draft override **used only by authorized preview code**". No caller exists yet so this is latent, but the seam should carry the requirement (e.g. require a `previewToken` alongside `draft: true`) rather than shipping a bare boolean.

### N8 — `publishedOrAuthenticated` grants full read to _any_ authenticated user

`packages/cms-core/src/access/roleAccess.ts:37-42` returns `true` for `req.user` regardless of role. Correct today (one auth collection, two roles), wrong the moment a customer/subscriber auth collection is added. Scope it to `isAdminOrEditor`.

### N9 — Media uploads are unconstrained and publicly readable

`packages/cms-core/src/collections/Media.ts:4-15`: `upload: true` with no `mimeTypes` allowlist, no `filesize` limit and no `staticDir`, combined with `read: readAny`. An editor can upload `.svg`/`.html` served from the app origin — stored XSS. Also, with no `staticDir`, uploads in the standalone Docker image land on ephemeral storage. Constrain `upload: { mimeTypes: [...], filesize: ... }`.

### N10 — `DATABASE_URI ?? ""` fails silently rather than loudly

`apps/tuyba/src/payload.config.ts:19`. `pg` treats an empty connection string as "use defaults", so a missing env var quietly attempts `localhost` with the OS user instead of producing a clear error. The `PAYLOAD_SECRET ?? ""` fallback on line 16 **is** safe — Payload throws `missing secret key` at init (`payload/dist/index.js:319`), so the comment on lines 9-13 is accurate for the secret but not for the DB URI.

### N11 — `packages/ui` primitives ship class names with no stylesheet

`Button.tsx:10-14` emits `nero-button--primary|secondary|danger` and `Link.tsx:17` emits `nero-link`, but no CSS for those classes exists anywhere in the repo, and the tokens are never applied to the primitives. `variant` currently has no visual effect. Also `Link.tsx:41-52` re-implements `VisuallyHidden` inline instead of importing the sibling component.

### N12 — Minor

- `apps/tuyba` has no `test` script, so `pnpm test` skips the app entirely.
- `.env.example` sits at the repo root while the app reads `apps/tuyba/.env`; README:46-48 documents the copy correctly, but `apps/tuyba/.env.example` would put it where it's used.

---

# What is genuinely fine

I checked these and found no problem — stating so rather than manufacturing findings.

- **All three boundary rules hold.** `packages/ui` imports only `react` (verified file by file — zero `cms-core`/`web-core`/db imports). `packages/web-core` has `"dependencies": {}` and `git grep payload -- packages/web-core` returns nothing. `packages/cms-core` has no customer branching — `git grep -i "tuyba\|customer"` hits only doc comments.
- **Admin dependencies stay out of the public client bundle.** `server/app/(frontend)/page_client-reference-manifest.js` contains zero `@payloadcms` and zero `lexical` references. (The public route does pull `payload` in server-side via the local API, which is expected and not a bundle concern.)
- **The build genuinely needs no database.** Verified in a fresh clone with no `.env` and no Postgres running: `next build` succeeded, emitting `ƒ /`, `ƒ /admin/[[...segments]]`, `ƒ /api/*`.
- **Standalone output matches the Dockerfile.** `.next/standalone/apps/tuyba/server.js` exists, matching `CMD ["node", "apps/tuyba/server.js"]`, and `static`/`public` copy targets are right. The runtime stage copies only standalone output — no dev dependencies ship.
- **No secrets are committed.** Only `.env.example` (placeholders) is tracked; `apps/tuyba/.env` is untracked and correctly gitignored. Pattern scan across tracked files is clean.
- **CI step ordering is correct** — `pnpm/action-setup` runs before `setup-node` with `cache: pnpm`, and `version: 12.4.2` matches `packageManager`, so no conflict error.
- **Commit authorship** matches ENGINEERING-RULES (`Hasan Ali Balcioglu <h.alibalcioglu@gmail.com>`).
- **The ADR** (`docs/architecture/0001-workspace-layout.md`) accurately describes what was built, including honestly flagging the deferred package build step.

---

# Acceptance criteria (SPRINT-01 §5)

| #   | Criterion                                                                    | Verdict                           | Evidence                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `pnpm install` completes with committed lockfile                             | **PASS**                          | Fresh clone + `pnpm install --frozen-lockfile` → 572 packages, done in 26.2s, no ignored build scripts. `pnpm-lock.yaml` tracked, `lockfileVersion: '9.0'`.                                                                                                                                                                                                                   |
| 2   | `lint`, `typecheck`, `test`, `build` all exit zero                           | **PASS**                          | Run twice (in place and in a clean clone). Lint: 4 projects Done. Typecheck: 4 projects Done. Test: 5 files / 14 tests passed. Build: compiled in 11.0s.                                                                                                                                                                                                                      |
| 3   | Payload generates types; Postgres adapter initializes against the compose DB | **NOT VERIFIED**                  | I did not start containers (read-only mandate). `payload-types.ts` is gitignored so there is no committed artifact to inspect, and neither CI (N3) nor any test touches Postgres. Orchestrator must run `docker compose up -d && pnpm --filter @nero/tuyba run generate:types` and capture output.                                                                            |
| 4   | App boots, serves home route, exposes admin path in the same app             | **FAIL**                          | Routes are correctly wired and build (`ƒ /`, `ƒ /admin/[[...segments]]`, `ƒ /api/[...slug]`, graphql). But **B4**: the empty import map means the Pages rich-text field will not render in the admin. Not booted against a DB.                                                                                                                                                |
| 5   | `packages/ui` has no runtime dependency on `cms-core`/`web-core`             | **PASS**                          | Every import in `packages/ui/src` is from `react`. `package.json` lists only React peer deps + test tooling.                                                                                                                                                                                                                                                                  |
| 6   | `web-core` published-only default covered by a test                          | **FAIL**                          | A test exists (`content.test.ts:13-37`) but asserts argument passthrough to a mock, not published-only behavior — and the runtime path does not filter by publication status at all (**B1**).                                                                                                                                                                                 |
| 7   | No secrets/`.env`/credentials committed; secret grep clean                   | **PASS** (git) / **FAIL** (image) | `git ls-files` shows only `.env.example`; pattern scan clean. But **B3** puts a real `PAYLOAD_SECRET` into the Docker image, which is the same concern one layer out.                                                                                                                                                                                                         |
| 8   | CI workflow syntactically valid and mirrors local commands                   | **PASS with caveats**             | Valid YAML; install/lint/typecheck/test/build mirror the root scripts, and I reproduced all five green. Caveats: unused Postgres service (N3), no `permissions` (N2), `format:check` omitted (N4).                                                                                                                                                                            |
| 9   | README steps reproduce a working local environment from a clean clone        | **PARTIAL**                       | Steps 1, 3, 4 verified as far as a DB-free run allows; the `cp .env.example apps/tuyba/.env` instruction is correct and the "build needs no DB" claim (README:74) is accurate. Not end-to-end verified (no DB started). Caveats: Windows clone CRLF breaks `format:check` (N4), and README:57's "create your first admin user" is misleading given the `editor` default (N1). |

**Summary: 4 PASS, 2 FAIL, 1 PASS-with-caveats, 1 PARTIAL, 1 NOT VERIFIED.** Sprint 1 should not close until B1–B4 are fixed and criterion 3 has actual command output behind it.

---

# Round 2 — Verification after fix pass (bc66e7b)

# Sprint 1 — Independent Review, Round 2

Working tree unmodified (`git status` clean). Locally verified: `pnpm lint` ✅, `pnpm typecheck` ✅, `pnpm format:check` ✅ ("All matched files use Prettier code style"), `pnpm test` ✅ (7 files, 28 tests — cms-core 7, web-core 14, ui 4, tuyba 3). Did not run `build` or docker, per mandate.

## 1. Verification table

| ID      | Verdict                                         | Evidence (current code)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1**  | **RESOLVED**                                    | `packages/web-core/src/content.ts:54-62` merges `_status: {equals:"published"}` whenever `draft !== true`; `:77`/`:92` apply it. `apps/tuyba/src/lib/content-client.ts:32,45` pass `overrideAccess: false`. `packages/cms-core/src/collections/Pages.ts:11-15` enables `versions.drafts`, so `_status` exists. Merge shape `{and:[where, publishedOnly]}` (`content.ts:61`) is correct for a nested `and`/`or` inside `where` — Payload ANDs the array, it does not flatten keys. Tests (`content.test.ts:23-35`) evaluate the `where` against real docs, so `:97-104` fails if the filter is removed.                                                                                                                                   |
| **B2**  | **RESOLVED**                                    | `Users.ts:35-38` sets field-level `access.create/update = isAdminField`; `roleAccess.ts:25` defines it from `isAdminCheck`. `users.test.ts:19-41` proves a `["editor"]` user gets `false` on both. Removing the field `access` block makes `rolesField?.access?.update` undefined → the test throws. Genuine.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **B3**  | **RESOLVED**                                    | `.dockerignore:6-8` — `**/.env`, `**/.env.*`, `!**/.env.example`, negation last. `apps/tuyba/.env` is excluded from context, so `next build` has no `.env` to copy into standalone output.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **B4**  | **RESOLVED**                                    | `apps/tuyba/src/app/(payload)/admin/importMap.js` is now 75 lines with real entries, including `@payloadcms/richtext-lexical/rsc#RscEntryLexicalCell`, `#RscEntryLexicalField`, `#LexicalDiffComponent` (lines 28-33) plus all feature clients. Not booted against a DB (read-only mandate).                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **N1**  | **RESOLVED** (introduces a new one — see NEW-1) | `Users.ts:29` `defaultValue: ["admin"]`; README:57-68 documents the first-user flow and why.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **N2**  | **RESOLVED**                                    | `ci.yml:9-10` `permissions: contents: read`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **N3**  | **RESOLVED**                                    | `ci.yml:67-68` runs `pnpm --filter @nero/tuyba run db:smoke`. I executed `apps/tuyba/scripts/db-smoke.ts` under `tsx` against a dead port: it loads the config, initializes the adapter, and fails loudly at connect with a non-zero exit. Module resolution (`@nero/cms-core` TS source, `next/constants`, `payload`) works under `tsx`. The script is sound. Two gaps, both minor: (a) N3 also asked for a `payload generate:types` step — that is still absent from CI, so acceptance criterion 3's "Payload generates types" half has no CI evidence; (b) `db-smoke.ts:12-13` `console.log` immediately followed by `process.exit(0)` can truncate stdout on a pipe — the exit code is still correct, only the "OK" line is at risk. |
| **N4**  | **RESOLVED**                                    | `.gitattributes:1` `* text=auto eol=lf`; `ci.yml:61-62` adds `Format check`. `pnpm format:check` passes locally.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **N5**  | **PARTIAL**                                     | Docstring corrected and honest (`cache.ts:1-8`); locale dimension added to all three helpers (`:12-23`) with a distinctness test (`cache.test.ts:20-22`). **Customer dimension still missing**, which PRD §8 requires alongside locale. Tags remain caller-less by design.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **N6**  | **RESOLVED**                                    | `docs/DEPLOYMENT.md` "Known limitation (Sprint 1)" documents the `NODE_ENV=production` / no-auto-push / no-migration gap accurately.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **N7**  | **RESOLVED**                                    | `content.ts:44-52` gates `draft: true` on a `previewToken` matching `PREVIEW_SECRET`; throws if the env var is unset _or_ empty string (`!secret`), and if the token is missing or mismatched. `types.ts:7-10` carries `previewToken` on the option type. Four tests cover unset, missing, and wrong token (`content.test.ts:138-166`). No bypass found: env-unset and empty-string both fail closed, and there is no "skip if not configured" branch. See NEW-4/NEW-5 for residual weaknesses.                                                                                                                                                                                                                                          |
| **N8**  | **RESOLVED**                                    | `roleAccess.ts:52-58` now requires `admin` or `editor`; a `roles: []` authenticated user gets the published-only constraint (`roleAccess.test.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **N9**  | **RESOLVED**                                    | `Media.ts:9-15` raster-only `mimeTypes` (SVG explicitly excluded, with reasoning), `staticDir: "media"`; `buildNeroConfig.ts:46-50` sets `upload.limits.fileSize` from `MAX_MEDIA_UPLOAD_BYTES` (10 MB). Ephemeral-storage half is still open — see NEW-3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **N10** | **RESOLVED**                                    | `payload.config.ts:20-24` throws with an actionable message unless `NEXT_PHASE === PHASE_PRODUCTION_BUILD`. Correctly scoped so `next build` still works DB-free.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **N11** | **PARTIAL**                                     | `Link.tsx:3,42` now imports the shared `VisuallyHidden` — resolved. But no stylesheet exists anywhere (`find packages/ui -name "*.css"` → empty), and `nero-button--primary\|secondary\|danger` / `nero-link` appear only in the two component files. `variant` still has no visual effect and `tokens.ts` is still never applied to the primitives.                                                                                                                                                                                                                                                                                                                                                                                     |
| **N12** | **RESOLVED**                                    | `apps/tuyba/package.json:13` `"test": "vitest run"` + `vitest.config.ts`; `.env.example` moved to `apps/tuyba/` (root copy deleted), README:47 updated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

**On the `accessEnforced` contract (asked explicitly):** it is an _attestation_, not a proof. `content-client.ts:35,47,49` hardcodes `accessEnforced: true` next to `overrideAccess: false`; nothing binds the two, so deleting `overrideAccess: false` leaves the assertion passing. The `types.ts:31-41` docstring is honest about what the literal type does and doesn't buy. The real regression guard is `content-client.test.ts:11-27`, which does assert `overrideAccess: false` and fails if removed. Acceptable as defence-in-depth; just don't describe it as a guarantee.

## 2. NEW blocking issues

None.

## 3. NEW non-blocking issues

**NEW-1 — `roles` now defaults to `admin` for _every_ user, not just the first** (`packages/cms-core/src/collections/Users.ts:29`). This fixes N1 but makes privilege-by-default permanent: an admin creating a second user in the admin UI gets `["admin"]` preselected and must actively downgrade it. Blast radius is bounded (only admins can create users or write `roles`, per B2's fix), so it is not an escalation path — but it is the wrong default. Payload's `defaultValue` accepts a function receiving `{ req }`; returning `["admin"]` only when the users collection is empty and `["editor"]` otherwise gets N1's benefit without the standing footgun.

**NEW-2 — the draft gate lives in `createContentClient`, not in the adapter, and the adapter is exported** (`apps/tuyba/src/lib/content-client.ts:22`). `payloadQueryClient.find({collection:"pages", draft:true})` and `.findByID({draft:true})` reach Payload with no `previewToken` check and no `_status` filter — only `overrideAccess: false` stands between them and draft content, and that only holds for unauthenticated requests. No caller does this today, but the export makes the bypass reachable. Either stop exporting `payloadQueryClient` or move `assertAuthorizedDraftAccess` into the adapter.

**NEW-3 — `findByID` swallows every error as "not found"** (`content-client.ts:48-50`). A bare `catch {}` collapses connection failures and unexpected errors into `{ doc: null }`, indistinguishable from a genuine miss. Narrow it to Payload's `NotFound`.

**NEW-4 — `previewToken` comparison is not constant-time** (`content.ts:49`, `previewToken !== secret`). Low practical exploitability over HTTP, but `crypto.timingSafeEqual` over hashed values is the cheap standard fix. There is also no minimum-length/entropy check on `PREVIEW_SECRET`, so `PREVIEW_SECRET=x` silently passes the `!secret` gate.

**NEW-5 — media persistence and `NEXT_PUBLIC_SERVER_URL` in the container are still undocumented.** `Media.ts:14` `staticDir: "media"` resolves to a container-local path, so uploads sit on ephemeral storage and are not shared across replicas; and with `.env` now correctly excluded from the build context, `next build` in Docker inlines the `http://localhost:3000` fallback from `payload.config.ts:27`. Both belong in the DEPLOYMENT.md "Known limitation (Sprint 1)" section that N6's fix introduced. Neither is verifiable without a docker build.

## 4. Verdict

**Sprint 1 can close**, with the caveats below.

All four blocking findings are genuinely fixed in the current code, not papered over, and the new tests are real: the web-core suite evaluates the emitted `where` against fixture documents rather than asserting call shape, and I traced each of B1/B2/B3 to a test or file state that would flip if the fix were reverted. Ten of twelve non-blocking findings are resolved; N5 (customer cache dimension) and N11 (no stylesheet for the UI primitives) are partial and are legitimate Sprint 2 carry-overs, not close blockers.

Two conditions on closing:

1. **Acceptance criterion 3 is still only half-covered in CI.** The DB smoke step is real and sound, so "the Postgres adapter initializes against the compose database" now has automation behind it. "Payload generates types" does not — add a `pnpm --filter @nero/tuyba run generate:types` step before `db:smoke`, or record the orchestrator's manual run output against the criterion.
2. **NEW-1 should be fixed before any second user exists** on a real deployment. It is a one-line change to a `defaultValue` function and does not warrant reopening the sprint, but it should not silently become the platform's standing default.

Criterion 4 (admin serves the rich-text field) remains unconfirmed visually — the import map is now correct and complete, but neither round of review booted the admin against a database. That is the orchestrator's to close with a screenshot or a manual check.

---

# Round 2 follow-up — orchestrator (d56b1fb)

All NEW-1 through NEW-5 items raised in round 2 were addressed:

- NEW-1: `Users.roles` `defaultValue` is now a function — `admin` only when the
  users collection is empty, `editor` for every user after that. Covered by two
  tests in `packages/cms-core/src/__tests__/users.test.ts`.
- NEW-2: `payloadQueryClient` is no longer exported, so the draft authorization
  gate in `createContentClient` cannot be bypassed by holding the adapter
  directly. Adapter tests now drive the composed `contentClient`.
- NEW-3: `findByID` re-throws anything that is not a Payload 404, so connection
  failures no longer masquerade as "not found".
- NEW-4: preview token comparison uses SHA-256 + `timingSafeEqual`, and
  `PREVIEW_SECRET` must be at least 32 characters. Both covered by tests.
- NEW-5: media persistence and build-time `NEXT_PUBLIC_SERVER_URL` limitations
  documented in `docs/DEPLOYMENT.md`.

Closing conditions from the round 2 verdict:

1. Acceptance criterion 3 is now fully covered in CI: a `Generate Payload types`
   step runs before the `Database smoke check` step, both against the workflow's
   PostgreSQL service. Verified locally against the compose database:
   `OK: postgres adapter initialized, pages query returned 0 docs` (exit 0).
2. NEW-1 fixed as described above.

Criterion 4 (admin renders the rich-text field) remains unconfirmed visually and
is carried into Sprint 2 as a manual check.
