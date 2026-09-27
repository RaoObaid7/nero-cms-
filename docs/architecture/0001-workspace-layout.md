# ADR 0001: Workspace layout for NERO CMS

Status: Accepted (Sprint 1)

## Context

NERO CMS must support multiple consumer applications sharing the same content
model, access rules and design system, without customer-specific forks or
conditionals inside shared code. TUYBA is the first consumer.

## Decision

Use a pnpm workspace monorepo with four top-level groups:

- `apps/*` — consumer applications. `apps/tuyba` composes a Next.js App Router
  project with Payload CMS mounted in the same deployment, injecting its own
  database adapter, secret and server URL into the shared config factory.
- `packages/cms-core` — the Payload configuration factory (`buildNeroConfig`),
  base collections (`users`, `media`, `pages`), role definitions and access
  helpers. Consuming apps extend it through explicit parameters
  (additional collections, plugins), never through branching on a name.
- `packages/web-core` — a CMS-agnostic public content access layer. It
  depends only on a small `ContentQueryClient` interface, which the
  application implements on top of the Payload local API. This keeps
  `web-core` free of any Payload or admin-UI dependency and lets published
  vs. draft behavior be unit-tested without a database.
- `packages/ui` — accessible primitives and design tokens with zero
  dependency on CMS or database code, so it can be reused, tested and
  versioned independently of content concerns.
- `tooling/` — shared TypeScript, ESLint, Prettier and Vitest configuration
  consumed by every package and app, so standards are defined once.

Packages are consumed as TypeScript source (no separate build step) via
Next.js `transpilePackages` and Vitest's own transform pipeline. This avoids
a build-order dependency graph in Sprint 1, at the cost of requiring a
bundler-aware consumer for anything outside this workspace — acceptable
since NERO CMS packages are not yet published externally.

## Consequences

- Adding a second consumer application means composing `buildNeroConfig` and
  the `web-core` content client again with that application's own
  environment configuration; no shared package changes are required for
  routine customer differences.
- `web-core`'s dependency-injected `ContentQueryClient` interface is the
  seam that keeps Payload's admin UI and database driver out of the public
  route bundle, satisfying the "no admin dependencies in public bundles"
  engineering rule.
- Because packages ship as source, publishing them outside this monorepo
  later will require adding a real build step (e.g. `tsup` or `tsc`); this
  is deferred until there is a second, external consumer.
