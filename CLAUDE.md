# CLAUDE.md

Engineering rules for working in this repository. Full detail lives in
`docs/implementation/ENGINEERING-RULES.md`; this file is the short version
loaded automatically into agent context.

## What this repo is

NERO CMS: a reusable Payload CMS + Next.js publishing platform. TUYBA
(`apps/tuyba`) is the first consumer application. See `docs/PRD.md` and
`docs/implementation/SPRINT-01.md` for requirements and active scope.

## Boundaries — do not cross these

- `packages/cms-core` owns content schemas, roles, publication lifecycle. It
  must never branch on a customer name.
- `packages/web-core` owns public content access and the cache-tag contract.
  It must not import Payload admin UI, and its read helpers must default to
  published-only content with an explicit, authorized override for drafts.
- `packages/ui` owns accessible primitives and design tokens. It must not
  import `cms-core`, `web-core`, or any database client.
- Customer-specific behavior belongs in `apps/*`, never in shared package
  conditionals.

## Standards

- TypeScript strict mode; no `any` in shared package public APIs.
- Payload admin dependencies must not enter public route bundles.
- Prefer React Server Components; keep client boundaries small.
- No secrets in source; keep `.env.example` in sync with real env vars.
- All code, identifiers, comments and commit messages are in English.

## Commands

`pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm dev`, `docker compose up -d` (starts local PostgreSQL).

## Verification

Never report a task complete without actually running the relevant command
and reading its output. A configured field or stub is not a working feature.
