# NERO CMS — Reusable Content Platform
## Product Requirements Document

Version: 1.1
Product: NERO CMS (working code name) — the shared publishing platform.
First consumer site: TUYBA, an Islamic-compliant travel booking platform whose initial phase is content and SEO.
Status: Final requirements baseline; architecture and scope accepted.
Orchestrator: GPT Astra.
Execution status: Not started. The current request authorizes finalizing this specification and recording it in Magnero, not deploying infrastructure or starting application implementation.

## 1. Purpose and success definition

Create NERO CMS, a reusable publishing platform for blog, article, news and marketing websites. TUYBA is its first consumer site, not a customer-specific condition embedded in shared code. NERO CMS is the platform name; TUYBA is the customer product and must not be used as the CMS identity. Future consumers include existing WordPress websites with custom landing pages, calculators, package comparisons, lead forms and conversion tracking.

Success means editors can publish comfortably, search engines receive meaningful initial HTML, and another customer can adopt and upgrade the shared platform without copying its core. Reduced maintenance divergence is a goal; zero operating cost is not promised.

This final specification supersedes PRD drafts 0.1 and 0.2. It consolidates the accepted architecture, SEO selections, deployment decisions and Google Tag Manager requirement. Product architecture is settled. Environment-specific launch prerequisites remain explicitly tracked in Section 15; none require inventing infrastructure details to finalize the PRD.

## 2. Confirmed decisions

- Next.js and Payload run together as one application deployment per customer/environment.
- Start on the existing Dokploy server, subject to capacity and recovery validation. Do not create separate frontend and CMS deployments initially.
- PostgreSQL is the content database. Separate customer databases/roles and environment credentials are required; physical database service placement is an operational decision before production.
- GitHub Actions orchestrates tests, immutable Docker image releases, controlled migrations and Dokploy deployment.
- S3-compatible object storage and a configurable media CDN preserve the existing media architecture concept.
- Cloudflare proxy/security and CDN use are compatible with the baseline. Do not split SSR onto Cloudflare Workers initially.
- Use a workspace monorepo, versioned shared packages and explicit project extension points. No customer core forks.
- All code, identifiers, comments, filenames, schemas, APIs, technical documents, tests, logs and developer tooling use English. CMS-managed content and intentional localization are exempt. Default interface copy is English; source identifiers remain English under localization.
- GPT Astra coordinates specialist subagents and verifies their results. Astro was a speech transcription ambiguity, not a framework selection.
- NERO CMS is the shared platform's working code name. TUYBA is the first consumer site and a separate future booking product. Shared packages, schemas and documentation must not be named after TUYBA, and the CMS must not be presented as a TUYBA-specific system.
- One explicit execution authorization is sufficient for routine progression within the approved scope. Material scope changes, unapproved spending, destructive operations and new production access require separate resolution.

## 3. Users and workflows

Authors create and revise rich-text articles, insert approved blocks, select media and submit drafts. Editors review, preview, publish, unpublish and restore content versions. Administrators manage roles, site configuration, SEO policies and authorized tracking configuration. Developers add themes and project modules through documented contracts. Operators deploy, monitor, back up and restore isolated customer environments. Visitors read accessible content and use optional forms/tools without downloading CMS editor code.

## 4. Scope

### 4.1 Initial delivery

- Posts with article/news differentiation, pages, categories, tags, authors, media, menus, site settings and redirects. Separate collections only where field, permission or workflow requirements justify them.
- Writing-first rich text for articles and an ordered, controlled block layout for landing pages.
- Drafts, autosave, authorized preview, version history and author/editor/admin permissions enforced server-side.
- TUYBA site templates for home, article, category, author and institutional pages, responsive navigation and simple published-content search without a dedicated search cluster.
- Publication scheduling with an explicitly tested scheduler/job runner, not merely a date field.
- All provider-independent SEO capabilities in Section 7.
- A reusable lead form reference with durable local acceptance and a test delivery adapter. Production CRM/email activation requires real provider configuration later.
- Google Tag Manager integration, consent-aware event delivery and script-management governance in the initial release. This is distinct from deferred analytics dashboards.
- Shared UI foundations and a differently branded reference site proving extension and upgrade compatibility.
- Automated tests, English editorial/operations documentation, deployment workflows and recovery drills.

### 4.2 Selected later phase

Search Console/GA4 reporting, index-status integration, rank tracking and performance history, external schema fetching/validation integrations, scheduled report delivery and customer connection management are selected but deferred to Phase 6. Initial production does not depend on these services being connected.

### 4.3 Explicitly excluded SEO features

Google Trends, pillar content designation, e-commerce SEO (including WooCommerce, Easy Digital Downloads and product-specific SEO/schema workflows), and Content AI. Ordinary internal-link suggestions remain included. Excluding e-commerce SEO does not cancel the separate future TUYBA booking product, which is a distinct application rather than a NERO CMS feature.

### 4.4 Future product work outside initial execution

Bookings, payments, live pricing, availability, supplier integration, hotel scraping, customer accounts/SSO, mobile apps, production medical calculators, hospital package comparison and full customer-site migrations. Do not create empty reservation services, queues or databases in anticipation.

Arbitrary editor-supplied executable scripts/HTML, unrestricted visual design, shared customer CMS databases and Kubernetes are outside the initial scope. GTM is a privileged, governed execution channel, not an exception permitting arbitrary scripts inside content blocks.

## 5. Architecture and extension contracts

Use a modular monolith per customer, with the following initial workspace boundaries:

- `apps/tuyba`: TUYBA site composition, routes, branding and project modules.
- `apps/reference-site`: non-production reuse fixture.
- `packages/cms-core`: content schemas, roles, publication lifecycle and extension interfaces.
- `packages/web-core`: public content access, block rendering, metadata, cache and tracking adapters.
- `packages/ui`: accessible visual primitives and tokens; no database or CRM access.
- `tooling`: shared builds, linting, typing, tests and CI workflows.
- `docs`: architecture decisions, editorial workflows and operations.

Projects register collections, blocks, renderers, approved configuration and integrations through public extension points. No `if customer == ...` branching belongs in the core. Validate duplicate block identifiers and missing renderers at development/build time. Keep admin/editor dependencies out of public browser bundles.

Private package registry distribution may follow when customer repositories need separation. Versioning and compatibility tests start immediately, regardless of package distribution method.

A custom homepage can remain a code-defined template with CMS-managed sections. Not every layout must be a fully generic page builder. Future calculators keep formulas and validation in tested code, with CMS-managed explanations and placement. Future package comparisons use structured records instead of opaque rich text.

## 6. Content and editor experience

Articles include title, excerpt, cover image, body, taxonomy, author, related content and publication metadata. Page layouts select from hero, rich text, image/text, gallery, quotation/information callout, content cards, FAQ and CTA blocks. Project modules add specialized blocks when required.

Editors receive meaningful labels, previews, constrained variants and sensible defaults. Do not expose arbitrary pixel values, unlimited nesting or executable JavaScript. Templates own the main H1; heading hierarchy is validated. Media records include dimensions, file type and alternative text; decorative images may intentionally have empty alt text.

### Editor experience baseline: WordPress familiarity

Content editors for these sites come from WordPress. The administration interface must meet their existing habits rather than expecting them to adapt; a divergence from WordPress behavior that costs an editor time is treated as a defect, not as polish. This is a functional requirement, not a visual preference, and it applies to every consumer site built on the platform.

Required behaviors:

- Slug fields populate automatically from the title as it is typed, remain editable, and stop synchronizing once the editor edits the slug directly or the document has been published. Published URLs must never change implicitly.
- The document edit screen presents a main editing column with a supporting sidebar for publication controls, status, scheduling, taxonomy and cover image, rather than a single undifferentiated field list.
- Where interface vocabulary differs between the underlying CMS and WordPress, prefer the WordPress term. Field descriptions are written for editors rather than developers.

Reusable editor-experience behavior belongs in the shared platform packages so every consumer site inherits it.

Each block has a stable persisted identifier, typed schema, validation, renderer and content fixture. Unknown/incompatible block data produces a monitored, controlled outcome rather than silent content loss.

TUYBA suitability/certification claims require provenance and review metadata where applicable. Distinguish supplier statements from editorial verification. Do not fabricate hotels, prices or certifications in demo content.

## 7. SEO capability register

This is a functional implementation scope inspired by the selected catalog, not a promise of Rank Math binary compatibility or perpetual parity with future plugin releases.

| ID | Capability | Phase |
| --- | --- | --- |
| SEO-101 | Per-document SEO title/description, dynamic templates and content-type defaults | 3A |
| SEO-102 | Search snippet preview, canonical, robots directives and social metadata/cards | 3A |
| SEO-103 | Primary category and consistent breadcrumbs/markup | 3A |
| SEO-104 | Primary/additional keywords; presence, density, length, URL and heading checks | 3B |
| SEO-105 | Duplicate keyword warnings, title/content readability, media and link checks | 3B |
| SEO-106 | Explainable SEO checklist/score and non-AI internal-link suggestions | 3B |
| SEO-107 | XML sitemaps with content-type/taxonomy inclusion and exclusions | 3A |
| SEO-108 | Opt-in news and video sitemaps | 3B |
| SEO-109 | Redirect manager, 301/302/307, automatic slug redirects, 410/451 responses | 3A |
| SEO-110 | Safe regex redirects, priority/conflict inspection and debugging | 3B |
| SEO-111 | Basic/advanced 404 monitoring, aggregation, filtering and retention | 3B |
| SEO-112 | Non-commerce schema presets, generation and local structural validation | 3A |
| SEO-113 | Custom schema builder/templates, multiple schemas and validated JSON-LD | 3B |
| SEO-114 | Schema import from pasted/uploaded data and supported exports | 3B |
| SEO-115 | Remote schema import and external validation handoff/integration | 6 |
| SEO-116 | Video detection from supported blocks and Speakable markup | 3B |
| SEO-117 | Image alt/title templates and metadata automation | 3B |
| SEO-118 | Local business and multiple-location models/schema | 3B |
| SEO-119 | Podcast content, structured metadata and feed output | 3B |
| SEO-120 | SEO permissions and customer-level module enablement | 3A |
| SEO-121 | Yoast/AIOSEO/SEOPress export mappings and redirect imports | 3B |
| SEO-122 | Advanced filtering, aggregate SEO overview and local site audit | 3B |
| SEO-123 | Search Console, GA4 reporting and Google index-status integration | 6 |
| SEO-124 | Rank tracking, per-page ranking keywords and position history | 6 |
| SEO-125 | Winning/losing keywords/content and search-performance reports | 6 |
| SEO-126 | Scheduled email and customer-branded reports | 6 |
| SEO-127 | Agency customer-site connection management for reporting | 6 |

Acceptance rules:

- Normalize text, links and media from rich text and every block before analysis. Expensive analysis stays off the public rendering path.
- Recommendations are explanatory and non-blocking by default. Unsupported language-specific checks display unavailable rather than false failure. Keyword duplication is not proof of cannibalization; SEO scores are not Google scores.
- Link suggestions use published, accessible, locale-appropriate content without AI or paid APIs.
- Initial presets cover Article/BlogPosting/NewsArticle, BreadcrumbList, Organization, Person, WebSite, LocalBusiness, FAQPage, VideoObject and PodcastSeries/PodcastEpisode, plus appropriate Speakable support. Use the custom builder for additional non-commerce cases. Do not claim exhaustive vocabulary coverage or guaranteed rich results.
- Schema inputs are validated data, never executable scripts. Deduplicate graph IDs and match visible content. Distinguish structural validation from search-engine eligibility.
- Test news/video protocol fields, limits, inclusion/exclusion and update behavior.
- Restrict sensitive redirect/status changes by role; bound regex execution and prevent loops/open redirects.
- Redact sensitive queries from 404 logs, limit cardinality and enforce retention.
- Image automation preserves explicit values and intentionally empty alt text. Generated metadata is editable, not verified visual understanding.
- Imports are dry-run-first and repeatable, with field/conflict reports. Test documented export fixtures; do not promise arbitrary plugin-format compatibility.
- Remote import requires SSRF protection, private-network blocking, redirect validation, bounded size/time and content-rights consideration. Never execute imported scripts.
- Every ID requires implementation and test evidence. A field, placeholder, mock or disabled stub is not a completed capability.

## 8. Rendering, cache and performance

Main content, headings, internal links and metadata must exist in initial HTML without browser JavaScript. Prefer cached/static public rendering with targeted regeneration. Use small client boundaries, batch related reads and limit relationship depth. Public content access explicitly enforces publication status and permissions even when in-process APIs can bypass default access controls.

Preview is authorized, private/no-store and excluded from public caches and indexing. Noindex alone is not security. Publish/update/unpublish/delete/slug changes invalidate detail routes, listings, relevant relationships and sitemaps. Cache keys include required customer and locale boundaries. Personal data and form responses never enter public caches.

Healthy-system publication propagation target: within 60 seconds across the selected topology, verified by tests. Failures are observable and retryable; urgent removals have an operational purge path. Canonicals use trusted domain configuration. Sitemaps contain published, indexable canonical URLs. Define archive/search/pagination index policies explicitly.

Use responsive images with dimensions, correct above-the-fold loading and controlled heavy embeds. Choose one primary image transformation owner instead of duplicating processing across CMS, Next.js and CDN.

Lab acceptance: median mobile Lighthouse performance score at least 90 across three documented production-build runs for home/article/category fixtures with realistic assets. Report runs both without optional third-party tags and with the approved production tag set; do not hide tag costs. Field objectives, when sufficient data exists: p75 LCP <=2.5 seconds, INP <=200 ms and CLS <=0.1. These are targets, not current measurements or ranking guarantees.

## 9. Forms, Google Tag Manager and privacy

### 9.1 Lead forms

Provide server validation, abuse controls, minimal data collection, permissioned access, consent metadata and retention. Durable acceptance precedes a success response. Distinguish accepted, queued and delivered states. Delivery adapters use idempotency and bounded retry/recovery; test adapters must never be presented as live delivery.

### 9.2 Initial-release GTM requirement

- Provide a shared GTM integration with validated container ID, enabled flag and explicit production/staging configuration. Restrict changes to authorized administrators and retain an audit trail.
- Marketing/analytics scripts are managed through authorized GTM workspaces, versions and publishing permissions rather than code changes for each tag. The application owns the loader, dataLayer contract, consent bridge and safety controls. No GTM management API integration is required initially.
- GTM configuration is environment-specific and must not leak staging IDs or preview tokens into production. Secrets and provider API credentials never belong in the client dataLayer or GTM web container.
- Mount the loader once, after the consent strategy permits it, without blocking primary rendering. Exclude Payload admin, authenticated preview and ordinary test/preview environments by default. Support an audited emergency disable switch and documented GTM container rollback.
- Define dataLayer event names and typed payloads for page_view, cta_clicked, form_started and lead_submitted; future calculator_completed/package_compared follow the same contract. Send a lead conversion only after durable acceptance.
- Track client-side route changes exactly once and prevent duplicate pageviews from overlapping application events, GTM history triggers or vendor auto-measurement. Assign ownership of each event explicitly.
- Integrate a selected consent manager with appropriate consent categories and Google Consent Mode signals where applicable. Conservative default: no nonessential tracking requests before consent. Advanced/cookieless measurement is not implicitly authorized and requires explicit policy approval. Initialize consent before tag execution and test grant, denial and withdrawal.
- Consent Mode is not a consent banner or a compliance guarantee. GTM does not automatically gate every custom/vendor tag. All configured tags require consent-category review and appropriate firing rules.
- No names, email addresses, phone numbers, health inputs/results, free-text form values or sensitive URL/query data may enter analytics events, session replay or error telemetry. Page/location fields must be sanitized.
- Prevent ordinary editors from entering arbitrary scripts in content fields. Prefer reviewed GTM templates over Custom HTML; custom code tags require privileged review. GTM permissions effectively grant site script execution and must be treated accordingly.
- Use a documented CSP compatible with the approved GTM/tag set. Do not broadly weaken policy or apply unsafe-inline merely to make tags work. Nonces/hashes and cache compatibility must be validated against the actual rendering mode and chosen tags.
- A blocked GTM script, ad blocker, missing consent or vendor outage must not break navigation, forms or other core functions. Document tag budgets and regression checks after container changes.

### 9.3 GTM versus deferred analytics

The initial release includes container loading, consent integration, dataLayer events and real-container validation once an authorized container is supplied. GA4 tags may later be configured through GTM under the approved consent policy. Pulling GA4/Search Console data into CMS dashboards, OAuth connections, keyword tracking and report delivery remain Phase 6. A mock dataLayer test is not proof of a working production GTM container.

### 9.4 Health-related future modules

Do not persist calculator inputs/results by default or leak them through URLs, tracking, logs or replay. Production formulas require documented sources, versions, units, boundary tests and qualified review. Results and package comparisons must not imply unreviewed diagnosis or medical suitability.

## 10. Deployment and media contract

### 10.1 Topology

Use the existing Dokploy server for the combined Next.js/Payload application per customer/environment. Keep PostgreSQL, credentials and upload access isolated. A shared PostgreSQL host with separate databases/roles is possible but shares failure and resource domains. Confirm database placement before production; persistent volumes are not backups.

Keep application/database regions compatible. Storage is external S3-compatible infrastructure with configurable CDN delivery. Cloudflare may provide proxy/security and media/static distribution without executing frontend SSR on Workers. Existing Dokploy capacity/version/workloads have not been inspected; no production-readiness claim is made.

### 10.2 CI/CD

- Reusable GitHub Actions workflows run frozen-lockfile installs, lint/type/unit/integration/security checks and production builds against disposable test databases.
- Build customer application images on CI, not the production server. Publish immutable commit/release-tagged images and deploy by digest using validated Dokploy registry/API capabilities.
- Actions is the sole release trigger; avoid duplicate host auto-deploys. Restrict workflow permissions, pin actions and protect secrets from untrusted pull requests.
- Preview environments use fixtures, isolated databases/storage, access protection and no real CRM/email/production credentials.
- Serialize releases and migrations per environment. Run migrations as a controlled job in the target network, never from every replica or an unrestricted public database connection.
- Test staging before production promotion. Promote the same artifact only when build-time values permit it; otherwise independently test environment-specific artifacts and do not claim identical promotion.
- Avoid production database reads during build. Do not bake staging content, NEXT_PUBLIC values or domain settings into an image later promoted incorrectly.
- Verify health before traffic acceptance and smoke-test after release. Retain compatible prior images. Code rollback does not reverse database migrations.
- Deploy only affected customers for project changes; test shared changes across consumers and roll them out incrementally.

Content publication updates data and invalidates caches; it does not trigger a full application deploy. Release approvals in GitHub are team policy, distinct from repeated conversational phase confirmations.

### 10.3 Cache and jobs

Start with one application instance only if the availability target allows it. Restart may discard rebuildable cache, never persistent content or media. Test old/new release overlap, asset compatibility and cache invalidation before claiming safe rolling deployment. Multiple replicas require appropriate shared cache/tag coordination and server-function/deployment consistency; simply adding Redis is insufficient.

Do not enable generic HTML cache-everything at an external CDN. Start with media/immutable asset delivery and application-controlled page caching. Any HTML CDN layer needs correct response variants, preview/cookie exclusions and coordinated purge.

Scheduling, scans and delivery retries use bounded, idempotent jobs with concurrency controls. An explicit worker/scheduler may use the same codebase/image when needed; one web deployment does not mean every background task must run in an unreliable in-process timer.

### 10.4 Media

Use the official Payload S3 storage adapter with a thin shared policy/configuration wrapper. Configure endpoint, region, bucket, prefix, credentials, addressing behavior where required, CDN base URL and access mode. Validate the actual provider's uploads, deletes, range reads, CORS and signed operations.

Persist media IDs, object keys, type, dimensions and variants as durable identity; derive delivery URLs. Reuse existing WordPress object/CDN conventions only after inspection; PHP plugin code is not portable runtime code.

Public editorial media uses a customer-controlled CDN hostname, ideally with protected origin access where supported. Direct public URLs bypass application authorization by design. Use explicit public collections, immutable/versioned keys, replacement and purge policies. Draft documents do not make publicly hosted images private.

Restricted attachments use private storage/collections and authorization before short-lived signed access. Never expose health records on public CDN paths. Validate type/content/size, upload authorization and cleanup. Direct-to-storage uploads need finalization, validation and variant processing; abandoned uploads require cleanup.

### 10.5 Recovery and operations

Back up PostgreSQL and media off-server with tested restoration; use PITR/versioning only where actually supported/configured. Restore matching database/object references into an isolated environment. CDN caches and container images are not data backups. Monitor errors, jobs, upload failures, publication lag, disk/storage limits and database connectivity without leaking sensitive data.

Initial recovery planning targets are RPO <=24 hours and RTO <=4 hours, subject to actual topology and restore evidence before production. No uptime, cost or recovery guarantee is asserted before validation.

## 11. Versioning and migration

Track package, database migration and persisted block-schema versions separately. Pin a tested runtime/dependency set. Applied migrations are immutable and recorded per customer with concurrency locks and interruption recovery. Prefer expand, convert, migrate consumers, then remove for breaking changes.

Maintain old-content fixtures and both-consumer regression tests. Releases document code rollback limitations, backups and forward-fix procedures. Define supported release windows before onboarding additional production customers; do not force simultaneous customer upgrades.

WordPress import tools are part of the selected SEO scope, but no production customer migration is automatically authorized. A pilot inventories URLs, media, taxonomies, metadata, shortcodes, custom fields, multilingual relationships and tracking. Record migrated/redirected/explicitly excluded outcomes; test repeated imports, content parity and redirect loops.

## 12. Phased delivery and exit gates

### Phase 0 — Final requirements baseline

Deliverables: this final PRD, accepted architecture, tracked feature IDs and Magnero implementation task. Product decisions are settled; operational prerequisites are not silently marked complete. This planning request does not start coding.

### Phase 1 — Foundation and contracts

Workspace, shared tooling, content/permission models, extension interfaces and reproducible local startup. Exit: build/type/tests pass, no committed secrets, isolated configuration and fresh database initialization verified.

### Phase 2 — Editorial workflows and blocks

Implement rich text, controlled blocks, media, drafts/preview/version history and scheduling. Exit: all role scenarios pass; drafts stay out of public reads/search/sitemaps; restore and scheduler behavior are exercised. Two WordPress-experienced editors complete representative authoring tasks after at most 30 minutes of orientation without developer assistance. If editors are unavailable, report that gate pending.

### Phase 3A — TUYBA site frontend, foundational SEO and GTM plumbing

Implement public templates/search, rendering/cache lifecycle and all SEO IDs assigned to 3A. Deliver the WordPress-familiarity editor baseline defined in section 6, including automatic slug population and the main-column/sidebar edit screen. Add shared GTM configuration, loader, event and consent interfaces. Establish automated end-to-end browser tests covering the editor-to-visitor journey, draft and scheduled-content privacy, preview authorization and public smoke routes, running against a real build and database in continuous integration. Exit: initial-HTML, metadata/status/sitemap and cache propagation tests pass; defined lab performance budget is met; loader is excluded from admin/preview and never duplicates on navigation; the end-to-end suite passes in continuous integration and a failure blocks the build.

### Phase 3B — Provider-independent advanced SEO

Implement all IDs assigned to 3B. Exit: each capability has test evidence; all block content participates in analysis; no provider credentials are required; disabled modules do not ship unnecessary public runtime; enabled modules pass representative fixtures. Run security/accessibility/performance regression tests.

### Phase 4 — Reuse, forms and tracking validation

Implement differently branded reference site, a project extension, form acceptance/test delivery adapter and complete consent/dataLayer flows. Exit: no core fork or customer branching, one shared upgrade succeeds for both consumers, content migration preserves fixtures, form retries/duplicates are tested, and consent-denied/granted/withdrawn cases pass. Validate actual authorized GTM container behavior when available; report credentials-dependent tests pending rather than inventing success.

### Phase 5 — Release readiness and controlled rollout

Configure authorized staging/production targets, CI/CD, monitoring, editorial guide and recovery procedures. Exit: no unresolved critical/high security findings; keyboard/focus checks and automated accessibility scans pass on critical routes; restore/migration recovery and image/media persistence are exercised; real tag configuration and production-like performance are reviewed. Release only to explicitly authorized environments.

### Phase 6 — Deferred external SEO and reporting

Implement provider-dependent IDs after API access, quotas, costs, consent and customer authority are resolved. Exit: real-provider smoke tests verify data, refresh/revocation, throttling, retries, customer isolation and reporting. Mocks are test aids, not integration proof. If access is unavailable, mark Phase 6 deferred; it does not invalidate a complete initial release.

## 13. Acceptance evidence matrix

| ID | Requirement | Required evidence |
| --- | --- | --- |
| LANG-01 | English engineering artifacts | Review and reliable automated checks; localized content exempt |
| EDIT-01 | Comfortable editor workflow | Real editor task outcomes or explicit pending status |
| EDIT-02 | WordPress-familiar administration | Automated tests for slug population and its stop conditions; recorded review of the edit screen arrangement |
| AUTH-01 | Roles and draft isolation | API/browser tests including privileged local reads |
| RENDER-01 | Crawlable initial content | HTTP/JavaScript-disabled HTML assertions |
| E2E-01 | Editor-to-visitor journey integrity | Automated browser tests against a real build and database in continuous integration, covering publication visibility, draft and scheduled privacy, preview authorization and public smoke routes; a failure blocks the build |
| CACHE-01 | Lifecycle consistency | Timed publish/update/unpublish/delete/slug tests |
| SEO-01 | Full selected SEO scope | Tests mapped to every register ID and phase |
| PERF-01 | Defined performance budgets | Saved production-build runs and later field evidence |
| REUSE-01 | No-fork reuse/upgrades | Two-consumer builds, extension and upgrade tests |
| DATA-01 | Safe migrations/recovery | Migration fixtures and successful restore drill |
| PRIV-01 | Minimal form/telemetry data | Network/log inspection, consent and retention tests |
| GTM-01 | Governed script loading | One loader, environment isolation, admin/preview exclusion and kill-switch tests |
| GTM-02 | Consent-aware exact events | Grant/deny/withdrawal, route deduplication and durable lead conversion tests |
| GTM-03 | Real-container validation | Authorized container/tag preview and network evidence; no mocks as completion |
| A11Y-01 | Accessible key flows | Automated checks plus manual keyboard/focus review |
| OPS-01 | Verified deployment | Exact image release, migration serialization, health, rollback and media tests |

No placeholder, synthetic provider response or unexecuted test may be represented as working software. Report commands/results, defects and pending gates at phase boundaries.

## 14. Orchestration and change control

GPT Astra owns consistency, dependency ordering, synthesis and final verification. Subagents receive bounded implementation/review tasks with clear file ownership and acceptance criteria. Independent reviews run in parallel; dependent edits are sequenced. Verify artifact handles and external changes instead of trusting self-reported completion.

After execution authorization, proceed through approved phases without routine repeat permission. Allow user-directed revisions and record changes. Stop for expanded scope, unapproved spending, destructive production changes, unavailable credentials or decisions that materially change architecture. Finalizing this PRD and creating its task does not itself provision infrastructure or publish production tags.

## 15. Launch prerequisites and owners

These are delivery inputs and release gates, not unresolved core product architecture:

- Operations owner: Dokploy access/version, capacity, current workloads, deployment API/registry configuration, domains/TLS, network boundaries, database placement and off-server recovery.
- Operations/content owners: actual S3-compatible service/CDN, access policies, bucket/namespace layout, existing object conventions and retention requirements.
- Content owner: initial languages, production URL/locale strategy, brand assets and actual content. Use clearly labeled fixtures until supplied; settle locale URLs before production indexing/imports.
- Marketing/privacy owner: GTM container/workspace access, allowed tags, consent manager/categories, applicable policy review, staging behavior and production publishing permissions. Do not silently enable advanced consent measurement or arbitrary tracking.
- Delivery owner: expected traffic/media volume, availability/recovery objectives, release environment authority and budget limits.
- Platform owner: confirm whether NERO CMS is the final product name or remains a working code name before public-facing use, and define the supported package/dependency release policy. Shared packages use neutral technical names; do not encode TUYBA into shared identifiers.

No production launch is complete while its required inputs/tests are pending. Local implementation can use isolated fixtures, neutral naming, disabled tracking by default and environment contracts without waiting for production credentials. Provider-dependent reporting remains explicitly deferred.

## 16. Principal risks and controls

Scope growth: deliver phased capability IDs instead of attempting a generic WordPress clone. Core divergence: require a second-consumer upgrade test. Draft leakage: centralize access and cache rules. Stale pages: test invalidation dependencies. Unsafe migration: version contracts and rehearse recovery. Sensitive data leakage: minimize data and inspect telemetry. Third-party script regressions: govern GTM releases, consent, CSP and tag budgets. Server concentration: validate capacity and off-server restores. Editorial friction: test with actual editors. Hidden maintenance cost: share workflows without pretending customer operations disappear.

## 17. Final baseline statement

The accepted implementation direction for NERO CMS is Next.js + Payload on Dokploy with PostgreSQL, GitHub Actions, S3/CDN media, reusable shared modules, the selected SEO suite and initial-release Google Tag Manager support. Workers frontend separation is not selected. External analytics/reporting integrations follow later. The excluded features and deferred booking roadmap remain unchanged.

This document is ready to serve as the implementation source of truth. Environment credentials, launch evidence and authorization boundaries remain explicit; no application implementation or production deployment has been claimed.
