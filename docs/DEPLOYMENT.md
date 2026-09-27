# NERO CMS — Deployment and Media Architecture

Status: Supporting architecture rationale. The accepted baseline is consolidated in PRD.md v1.0; that document takes precedence. Infrastructure provisioning and production changes have not been performed.
Related specification: PRD.md, version 1.1. NERO CMS is the shared platform; TUYBA is its first consumer site.

## 1. Context and recommendation

The current operation uses Bedrock WordPress on WP Engine, Git repositories and GitHub Actions. An existing WordPress core plugin supports S3-compatible media storage and CDN delivery. Preserve the Git-driven delivery model and object-storage ownership rather than reproducing the PHP plugin or tying customer media to a compute provider.

Updated evaluation baseline: use the user's existing Dokploy server for initial application hosting, subject to capacity and recovery checks. GitHub Actions builds immutable application images; Dokploy runs one combined Next.js/Payload application service per customer/environment; PostgreSQL stores content; an independently configured S3-compatible service stores media; a dedicated media hostname fronts storage through a CDN. Payload supports standalone Docker deployment and Dokploy supports application/container deployment, registry selection, domains and resource controls.[1][6] Render remains an alternative if managed hosting later becomes preferable, not an initial requirement.[4]

Use a representative deployment spike after implementation approval before committing customer sites. Compare the actual deployment/backup/cache experience and operating cost, not only the entry-level hosting price. Existing server specifications, installed Dokploy version, workloads and backup configuration have not been inspected; no capacity or readiness claim is made.

### Cloudflare Workers decision

Do not split the initial public frontend onto Workers. Keep public routes, Payload administration and content APIs in one Next.js application on Dokploy. Separate route groups provide organization, not separate deployment targets. Use Cloudflare DNS/proxy/security and public asset/media delivery where configured; these functions do not require moving SSR to Workers.

Cloudflare supports Next.js SSR, RSC and ISR through the OpenNext adapter, but the deployed runtime is workerd rather than the local Node development runtime and needs dedicated preview/integration testing.[5] A remote frontend would introduce a network content API boundary, cross-deployment preview/authentication, cache invalidation delivery and coordinated release requirements. Serving computation near the user does not guarantee faster uncached pages if every render waits on a distant origin.

Revisit Workers when measured latency, geographical distribution, availability or scaling needs justify the added boundary. A full Workers deployment is a separate evaluation from splitting only the frontend and must validate Payload/dependency compatibility, database connectivity, storage, image processing and background jobs. Do not represent it as running the existing Docker image unchanged on Workers. No Workers rollout is selected at this point.

## 2. Hosting alternatives

- Managed container platform: a future alternative if operating the existing Dokploy host becomes undesirable, not the initial baseline. Validate chosen plan capabilities, region, private registry access, image-digest releases, pre-deploy jobs, rollback, availability and database recovery before purchase.
- Managed Next.js/serverless platform: strong candidate if minimum frontend platform work is the dominant criterion. Validate Payload upload paths, execution limits, image processing, database pooling, previews and separate background processing; do not assume every workload belongs inside a request function.
- Self-managed virtual machines with an application dashboard: consider when measured fleet economics justify owning operating-system patching, firewalling, capacity, failover and restore operations. A convenient deploy UI is not equivalent to managed infrastructure.
- Kubernetes: not part of the initial platform scope.

No claim is made that the existing WP Engine subscription can host the new runtime. Existing WordPress sites can remain there while new sites are evaluated separately.

## 3. Per-customer topology

Each production customer has a separately deployed application and credentials. Prefer a separate database service where stronger resource/failure isolation is required; a shared managed cluster with separate databases and roles is a cost option that must disclose its shared failure and resource domain.

Keep the application and database in compatible nearby regions. Separate production from staging. Use isolated storage buckets or enforceable bucket prefixes/identities per customer and environment. Naming conventions alone are not isolation. Record ownership so a customer can later be transferred without sharing another customer's secrets or data.

Database backups, production recovery features and availability are plan-dependent and must be verified. Do not use a development/free database tier as an assumed production recovery solution.

## 4. Delivery workflow

1. Pull request: frozen-lockfile install, lint, type checks, unit tests, content/SEO contracts, security checks, production build and integration tests against a disposable PostgreSQL database.
2. Trusted preview when useful: isolated fixtures/database and upload namespace; no production credentials, real lead data or customer emails. Never expose secrets to untrusted fork workflows. Preview is access-protected and noindexed; noindex alone does not protect data.
3. Main/release build: produce a customer-application image with commit/release metadata, scan it and publish to the registry with an immutable digest. Pin reusable workflows/actions and keep permissions minimal.
4. Staging release: lock the customer/environment deployment, apply reviewed migrations as a single controlled job, deploy the exact image and run smoke/E2E checks.
5. Production promotion: use the same tested image digest only when build-time configuration permits it. Resolve runtime domain/CDN configuration server-side and avoid embedding environment-specific public configuration at build time. If environment-specific builds are required, label and independently test those artifacts rather than claiming identical promotion.
6. Run production migrations with backup/recovery prerequisites, release health gates and compatibility with the currently running application. Never let every web replica race to migrate.
7. Switch traffic using the validated provider rollout mechanism, monitor startup/errors/cache behavior and retain the previous artifact. An unhealthy release fails rather than being reported as deployed.

GitHub Actions remains the release orchestrator. Avoid concurrent provider auto-deploy and Actions deploy triggers. Production environment approvals are a configurable team policy, not a request for the conversational assistant to ask again at every phase.

Reusable workflows accept the customer, app path, environment and release digest. Dependency-aware change detection deploys affected customers only; shared changes test all consumers before a staged rollout. Serialize migrations/releases per target; do not cancel a migration job midway just because a newer commit exists.

GitHub-hosted build runners should not receive unrestricted production database access. Run migration jobs within the approved target network/runtime. Prefer short-lived identity where supported; otherwise use narrowly scoped encrypted secrets with rotation.

## 5. Content publishing is not deployment

Editorial publication changes content and invalidates affected caches; it does not run a full GitHub build for every article. Code/schema releases use CI/CD. Content version rollback and application rollback are distinct operations.

Use a build strategy that does not require reading the production database. Seed build/test fixtures or defer content materialization to the runtime cache. Environment-specific content must not be baked into an artifact later promoted unchanged to another environment.

## 6. Cache and rollout contract

Next.js documents per-instance disk/memory caching and additional requirements for ephemeral compute, multiple instances, shared cache/tag invalidation, deployment identifiers and server-function consistency.[3]

Start with one application instance only if the accepted availability target permits it. The initial runtime cache may be rebuildable and lost during deploy; uploads and customer data may not be. Even temporary old/new instance overlap during a rollout requires cache/version-skew testing.

Do not enable generic HTML 'cache everything' at an external CDN. Initially use the CDN for public media and immutable assets, leaving page cache behavior controlled by the application/platform. If HTML edge caching is added, implement correct Next.js response variants, cookie/preview exclusions and coordinated purge; application invalidation does not automatically clear an unrelated CDN.

Before multiple web replicas, verify shared cache storage plus tag coordination, compatible server-action secrets, deployment identifiers and asset/version-skew behavior. A Redis service alone does not implement a correct cache adapter.

Scheduled publishing, SEO scans and reports use an explicit scheduler/worker when introduced. Jobs must be idempotent, bounded and protected against concurrent duplicate execution. Do not run unreliable in-process timers inside request-only infrastructure.

## 7. Media architecture

Use the official Payload storage adapter as the transport implementation, with a thin shared platform wrapper for customer configuration and policy. Payload documents an S3 adapter, S3-compatible configuration, direct client uploads and signed download support.[2]

Configuration contract: endpoint, region, bucket, prefix, addressing style where needed, credentials, public media base URL and access mode. Store stable object keys and media metadata as the durable identity; derive delivery URLs from configuration. CMS image blocks reference media IDs rather than provider URLs when possible. Rich-text links to legacy files need an explicit migration strategy.

The existing PHP plugin is not reusable as runtime code. Its object key layout, URL conventions, metadata and migration rules may be reusable after inspection. Do not assume the provider supports every S3 feature identically: test uploads, range reads, deletes, CORS, signed operations and addressing behavior on the actual service.

### Public media

Editorial images and public documents can be delivered through a customer-controlled media hostname. Prefer private origin access through the CDN where supported. Public delivery bypasses Payload's per-request authorization by design; the official documentation explicitly calls out this distinction.[2] Use a dedicated public collection and explicit policy rather than disabling access control globally.

Use unique or versioned object keys for replacements, long cache lifetimes for immutable files and explicit purge/tombstone procedures for urgent removals. A draft article can reference public media; protected drafts therefore need protected media as well, not merely an unlisted public URL.

### Private media

Form attachments, health records and restricted files use separate private storage/collections with authorization before signed access. No public CDN URL or predictable filename may grant access. Short-lived signed URLs limit access duration but require a separate revocation/deletion design for urgent incidents.

### Upload and processing

Support authenticated uploads, MIME/content validation, size limits and generated variants. Direct-to-storage signed uploads can avoid application request limits, but the object must be finalized, validated and associated with a media record; abandoned uploads require cleanup. Test the chosen adapter's image-variant workflow rather than assuming direct upload performs all processing automatically.

Choose one primary image transformation owner. A practical baseline is controlled upload-time responsive variants with CDN delivery; runtime optimization is an alternative to benchmark. Do not pay for or operate duplicate transformation paths accidentally. Preserve originals where the retention policy permits.

## 8. Backup, rollback and observability

- Database: automated backup/PITR according to the selected plan, tested restoration and documented recovery objectives.
- Media: versioning/lifecycle when supported, deletion recovery and protection against compromised credentials. CDN cache is not a backup; replication is not inherently protection from deletion.
- Recovery test: restore a database and representative corresponding objects to an isolated environment and verify references/variants. Define consistency across database and object-store recovery points.
- Application rollback: redeploy a compatible prior digest; never claim this reverses migrations. Prefer expand/contract changes and forward fixes for destructive data changes.
- Monitoring: service errors, database connectivity, jobs, media failures, publication/invalidation lag and storage limits. Redact leads, health data and credentials from logs.

## Known limitations (Sprint 1)

### Production schema creation

The Sprint 1 `Dockerfile` sets `NODE_ENV=production` in the runtime image, so
Payload's Postgres adapter will not auto-push schema on first boot (auto-push
only runs when `NODE_ENV !== 'production'`). No migration directory or
`payload migrate` step exists yet, and `CMD` runs `server.js` directly with no
pre-start migration hook. A fresh production database therefore needs its
schema created through a committed Payload migration (see the delivery
workflow in section 4) before the application can serve requests. This is out
of Sprint 1 scope and tracked as a follow-up.

### Media persistence in the container

The `media` collection uses a container-local `staticDir`, so uploads live on
the container filesystem. They are lost on redeploy and are not shared across
replicas. The S3-compatible storage adapter described in section 7 replaces
this before any customer deployment; until then, treat local uploads as
disposable development data.

### Build-time public configuration

`NEXT_PUBLIC_SERVER_URL` is inlined into the client bundle at build time. With
`.env` correctly excluded from the Docker build context, an image built without
that variable set falls back to `http://localhost:3000`. Pass the real public
URL as a build argument for any image intended for deployment, or resolve the
value server-side as section 4 step 5 requires.

## Known limitations (Sprint 2)

### Scheduled publishing has no deployed job runner yet

`publishScheduledContent` (`@nero/cms-core`) and the `apps/tuyba` script that
invokes it (`pnpm --filter @nero/tuyba run scheduler:run`) implement the
idempotent, concurrency-safe publish-when-due logic section 6 requires, and
are exercised against real PostgreSQL in CI. No cron entry, Dokploy scheduled
job or worker process invokes that script on a recurring basis yet — running
it is a manual/CI-only action today. Wiring an actual recurring invocation
(e.g. a Dokploy cron job, or a small worker container running the same image)
is a deployment-configuration follow-up, not a code change.

## 9. Infrastructure acceptance checklist

Before declaring the platform production-ready, verify real image deployment/rollback; migration serialization and failure recovery; restart persistence of content/media; public/private upload behavior; expired signed URLs; environment isolation; missing/deleted media handling; publish/unpublish propagation; preview cache isolation; overlapping-release behavior; backup restoration; and alerts on simulated failures.

Track cost by web instances, staging/previews, database and recovery tier, object storage/requests, CDN traffic, image processing, workers, logs and operational labor. No cost estimate is approved until fleet size, traffic, media volume, region and current storage provider are known.

## 10. Decisions pending

- Existing S3-compatible provider and CDN, customer bucket/hostname layout and current media volume.
- Initial and expected customer count, monthly traffic, availability expectations and required regions/data residency.
- Existing Dokploy server capacity, current workloads, installed version, operating responsibility and off-server backup readiness; decide managed versus Dokploy-hosted PostgreSQL explicitly. A database on the same server shares its failure domain even with persistent volumes.
- Production release policy, acceptable staging cost and backup/recovery requirements.

These decisions need not block local application development, but they block a final provider/plan selection and production rollout. No infrastructure has been provisioned by this proposal.

## Sources

[1] https://payloadcms.com/docs/production/deployment
[2] https://payloadcms.com/docs/upload/storage-adapters
[3] https://nextjs.org/docs/app/guides/self-hosting
[4] https://render.com/docs/deploy-nextjs-app
[5] https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs
[6] https://docs.dokploy.com/docs/core/applications
