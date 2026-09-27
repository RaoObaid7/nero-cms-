# NERO CMS — Engineering Rules

NERO CMS is a reusable Payload CMS + Next.js publishing platform. TUYBA is the first consumer site. See `docs/PRD.md` for full requirements and `docs/implementation/SPRINT-01.md` for the active sprint scope.

## Language

- All code, identifiers, comments, filenames, schemas, API names, tests, logs and commit messages use English.
- CMS-managed content and intentional localization are exempt.

## Architecture boundaries

- `apps/*` compose customer applications: routes, branding, project modules.
- `packages/cms-core` owns content schemas, roles, publication lifecycle and extension interfaces. It must never branch on a customer name.
- `packages/web-core` owns public content access, rendering helpers, metadata and cache contracts. It must not import Payload admin UI.
- `packages/ui` owns accessible primitives and design tokens. It must not import `cms-core`, `web-core` or any database client.
- Customer-specific behavior belongs in the application or a project module registered through a public extension point, never in shared package conditionals.

## Code standards

- TypeScript strict mode. No `any` in shared package public APIs.
- Public content queries default to published-only records. Draft access requires an explicit, authorized override.
- Payload admin dependencies must not enter public route bundles.
- Prefer React Server Components; keep client boundaries small and explicit.
- Semantic HTML and accessible controls. Templates own the page-level `h1`.
- No secrets in source. Use environment variables and keep `.env.example` in sync.

## Commands

- `pnpm install` — install workspace dependencies
- `pnpm lint` — ESLint across the workspace
- `pnpm typecheck` — TypeScript project checks
- `pnpm test` — Vitest suites
- `pnpm build` — production build
- `pnpm dev` — run the TUYBA application locally
- `docker compose up -d` — start local PostgreSQL

## Verification rules

- Never report a task complete without running the relevant command and reading its output.
- A configured field, placeholder, stub or mock is not a working feature.
- If a check cannot run, report it as pending with the reason. Do not fabricate results.

## Git

- Commit author: `Hasan Ali Balcioglu <h.alibalcioglu@gmail.com>`.
- Write focused commits with imperative English subjects.
- Never commit `.env`, credentials, build output or `node_modules`.
