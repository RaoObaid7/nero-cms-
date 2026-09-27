# Sprint 1 — Foundation and Content Contracts

Status: Plan approved for execution. Scope covers PRD Phase 1 only.
Repository: https://github.com/Magnero-Agency/nero-cms
Related: `docs/PRD.md` v1.1, `docs/DEPLOYMENT.md`

## 1. Sprint goal

Establish the NERO CMS workspace so a developer can clone the repository, start PostgreSQL, run one command and reach a working Next.js site plus Payload admin backed by shared packages. No editorial features, SEO suite, GTM or public templates are built in this sprint; those belong to later sprints.

Out of scope for Sprint 1: block catalog, SEO capability register, GTM integration, lead forms, TUYBA visual design, deployment to any server, and any provider credentials.

## 2. Deliverables

1. **Workspace**: pnpm workspace monorepo with `apps/`, `packages/`, `tooling/`, `docs/`.
2. **Application**: `apps/tuyba` running Next.js App Router and Payload in a single application, with the Payload admin mounted in the same deployment.
3. **Database**: PostgreSQL via the Payload Postgres adapter, with `docker-compose.yml` for local development.
4. **Shared packages**:
   - `@nero/cms-core`: Payload configuration factory, base collections (`users`, `media`, `pages`), role definitions and access helpers.
   - `@nero/web-core`: typed content access layer, published-only query helpers and a cache-tag contract.
   - `@nero/ui`: minimal accessible primitives and design tokens; no database or CMS imports.
5. **Tooling**: shared TypeScript config, ESLint, Prettier, Vitest; root scripts `lint`, `typecheck`, `test`, `build`.
6. **CI**: GitHub Actions workflow running install, lint, typecheck, test and build against a disposable PostgreSQL service.
7. **Docs**: `README.md` quick start, `.env.example`, `CLAUDE.md` engineering rules, and an architecture decision note for the workspace layout.

## 3. Technical constraints

- All code, identifiers, comments, filenames and commit messages in English.
- TypeScript strict mode; no `any` in shared package public APIs.
- `packages/cms-core` must not contain customer-specific branching. `apps/tuyba` composes configuration.
- Payload admin dependencies must not leak into public route bundles.
- Public content helpers in `web-core` must default to published-only reads and accept an explicit draft override used only by authorized preview code.
- Secrets never committed; `.env.example` holds placeholders only.
- Database access uses environment variables; no hardcoded connection strings.

## 4. Task breakdown

| ID | Task | Owner |
| --- | --- | --- |
| S1-01 | pnpm workspace, root config, `.gitignore`, `.editorconfig`, `.env.example` | coder |
| S1-02 | `tooling/` shared TS/ESLint/Prettier/Vitest configuration | coder |
| S1-03 | `packages/ui` tokens and primitives with tests | coder |
| S1-04 | `packages/cms-core` config factory, collections, roles, access helpers | coder |
| S1-05 | `packages/web-core` content access layer and cache-tag contract with tests | coder |
| S1-06 | `apps/tuyba` Next.js + Payload integration, admin route, home route | coder |
| S1-07 | `docker-compose.yml` for PostgreSQL, app `Dockerfile` (standalone output) | coder |
| S1-08 | GitHub Actions CI workflow with PostgreSQL service | coder |
| S1-09 | README quick start, CLAUDE.md, architecture decision note | coder |
| S1-10 | Review pass, fixes, verification evidence | reviewer + orchestrator |

## 5. Acceptance criteria

Every item requires actual command output, not assertion.

- `pnpm install` completes with a committed lockfile.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` all exit zero.
- Payload generates types and the Postgres adapter initializes against the compose database.
- `apps/tuyba` boots, serves the home route and exposes the Payload admin path in the same application.
- `packages/ui` has no runtime dependency on `cms-core` or `web-core`.
- `web-core` published-only default behavior is covered by a test.
- No secrets, `.env` files or credentials are committed; `git grep` for obvious secret patterns is clean.
- CI workflow file is syntactically valid and mirrors the local commands.
- `README.md` steps reproduce a working local environment from a clean clone.

## 6. Execution model

- Orchestrator: GPT Astra — planning, sequencing, verification, git and reporting.
- Coder: Claude Code with the Sonnet model — implementation tasks S1-01 to S1-09.
- Reviewer: Claude Code with the Opus model — independent review of correctness, boundaries, security and acceptance criteria; the coder applies required fixes.

Work lands on `main` in reviewed increments. The orchestrator verifies commands itself before reporting a task complete; a coder or reviewer claim alone is not evidence.

## 7. Risks

- Payload and Next.js major-version drift: pin a tested release set in the lockfile.
- Windows and Linux path or script differences: prefer cross-platform scripts and verify in CI.
- Premature abstraction in shared packages: keep Sprint 1 interfaces minimal and driven by the single consumer application.
- Database container availability during CI: use the Actions PostgreSQL service with a health check.

## 8. Definition of done

All acceptance criteria verified locally, the reviewer's blocking findings resolved, changes pushed to `main`, and a sprint report recorded with the exact commands and results. Remaining defects or skipped checks are reported explicitly rather than omitted.
