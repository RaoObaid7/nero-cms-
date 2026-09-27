# NERO CMS — Reusable Content Platform

NERO CMS is a shared Payload CMS + Next.js publishing platform. NERO CMS is a working code name.

TUYBA — an Islamic-compliant travel booking platform — is the first consumer site. Its initial phase is content and SEO; the booking application is a separate future product, not a CMS feature.

## Status

Sprint 1 complete: a working pnpm workspace with `apps/tuyba` (Next.js App Router + Payload CMS in one application), the shared `@nero/cms-core`, `@nero/web-core` and `@nero/ui` packages, local Postgres via Docker Compose, and CI.

Sprint 2 complete: `Articles`, `Categories` and `Tags` collections; an eight-block catalog (`hero`, `richText`, `imageText`, `gallery`, `callout`, `contentCards`, `faq`, `cta`) with the `layout` field on `Pages`/`Articles`; a block-rendering contract in `@nero/web-core`/`@nero/ui` that skips and logs unknown blocks instead of throwing; a `/preview` route with the draft-token gate, noindex and non-cacheable responses; scheduled publishing (`publishAt` + `publishScheduledContent`); and version history/restore. See `docs/implementation/SPRINT-02.md` and `docs/EDITORIAL.md`.

No SEO suite, GTM integration, lead forms, TUYBA visual design or production deployment exist yet — those are later sprints.

## Documents

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document v1.1 (final requirements baseline).
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Supporting deployment and media architecture rationale. The PRD takes precedence.
- [`docs/implementation/SPRINT-01.md`](docs/implementation/SPRINT-01.md) and [`docs/implementation/SPRINT-02.md`](docs/implementation/SPRINT-02.md) — sprint scope.
- [`docs/EDITORIAL.md`](docs/EDITORIAL.md) — editor-facing guide to blocks, drafts, preview, scheduling and restore.
- [`docs/implementation/ENGINEERING-RULES.md`](docs/implementation/ENGINEERING-RULES.md) — engineering rules (see also `CLAUDE.md`).
- [`docs/architecture/0001-workspace-layout.md`](docs/architecture/0001-workspace-layout.md) — ADR for the workspace layout.

## Workspace layout

```
apps/tuyba          Next.js App Router application with Payload CMS mounted in the same app
packages/cms-core    Payload config factory, base collections, roles and access helpers
packages/web-core    Published-only content access layer and cache-tag contract
packages/ui          Accessible primitives and design tokens (no CMS/DB dependency)
tooling/             Shared TypeScript, ESLint, Prettier and Vitest configuration
docs/                Requirements, deployment notes, sprint plans, architecture decisions
```

## Prerequisites

- Node.js 20.9 or newer
- pnpm 12 (`corepack enable` will pick up the version pinned in `package.json`)
- Docker (for local PostgreSQL)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start local PostgreSQL
docker compose up -d

# 3. Configure environment variables
# Next.js loads .env files from the application directory.
cp apps/tuyba/.env.example apps/tuyba/.env

# 4. Run the app
pnpm dev
```

Then open:

- http://localhost:3000 — the TUYBA frontend
- http://localhost:3000/admin — the Payload admin

### Creating the first admin user

Visiting `/admin` with no users yet shows Payload's registration form. The
`roles` field defaults to `admin` specifically for this flow: Payload's
first-user registration bypasses the collection's normal `create: isAdmin`
access rule, so if the default were `editor` you would end up with an
editor-only account and no UI path to grant yourself admin afterwards.
Register normally and accept the default — the account you create here
becomes the admin. When an admin later creates additional users from the
admin UI, explicitly set their `roles` to `editor` unless they should also be
admins.

## Common commands

| Command                                        | Description                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm install`                                 | Install workspace dependencies                                       |
| `pnpm dev`                                     | Run the TUYBA application locally                                    |
| `pnpm lint`                                    | ESLint across the workspace                                          |
| `pnpm typecheck`                               | TypeScript project checks across the workspace                       |
| `pnpm test`                                    | Vitest suites across the workspace                                   |
| `pnpm build`                                   | Production build (does not require a live database connection)       |
| `docker compose up -d`                         | Start local PostgreSQL                                               |
| `pnpm --filter @nero/tuyba run generate:types` | Regenerate `apps/tuyba/src/payload-types.ts` from the Payload config |

## Notes on the build

`apps/tuyba`'s frontend and admin routes are rendered per request (`export const dynamic = "force-dynamic"` on the frontend home route; Payload's admin routes are dynamic by default), so `pnpm build` succeeds without a reachable database. A real `DATABASE_URI` and `PAYLOAD_SECRET` are only needed to actually serve requests (`pnpm dev` / `pnpm start` / the Docker image at runtime).

## Naming

Shared platform code, packages and schemas use NERO CMS or neutral technical names. Customer-specific naming belongs to consumer applications such as the TUYBA site.

## Engineering language policy

All code, identifiers, comments, filenames, schemas, API names, technical documentation, tests and commit messages use English. CMS-managed content and intentional localization are exempt.

## Engineering rules

See `CLAUDE.md` and `docs/implementation/ENGINEERING-RULES.md` for architecture boundaries, code standards and verification rules that apply to all contributions, including AI agents.
