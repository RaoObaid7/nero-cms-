import path from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildNeroConfig } from "@nero/cms-core";
import { invalidateCacheTags } from "./lib/invalidate-cache-tags";
import { articlePath, pagePath } from "./lib/urls";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const databaseURI = process.env.DATABASE_URI;

// This file is imported while Next.js collects page data at build time
// (NEXT_PHASE=phase-production-build), which must succeed without a live
// database connection or real secrets present, so we cannot throw
// unconditionally at module scope. Outside that phase — i.e. whenever the
// app is actually starting up to serve requests — a missing DATABASE_URI
// must fail loudly here: `pg` otherwise treats an empty connection string as
// "connect to localhost with the OS user," which fails confusingly far away
// from the real cause. See README.md quick start for local setup.
if (!databaseURI && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
  throw new Error(
    "DATABASE_URI is not set. Copy apps/tuyba/.env.example to apps/tuyba/.env and set a real Postgres connection string.",
  );
}

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

export default buildNeroConfig({
  serverURL,
  secret: process.env.PAYLOAD_SECRET ?? "",
  db: postgresAdapter({
    pool: {
      connectionString: databaseURI ?? "",
    },
  }),
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  // The admin "Preview" button and live preview both call this to build the
  // frontend URL. The `/preview` route and its query contract are TUYBA
  // specifics, so they live here rather than in `@nero/cms-core`. Preview
  // stays unconfigured (button hidden) if `PREVIEW_SECRET` is not set.
  previewUrl: ({ collectionSlug, doc }) => {
    const secret = process.env.PREVIEW_SECRET;
    const slug = typeof doc.slug === "string" ? doc.slug : undefined;
    if (!secret || !slug) return undefined;
    const params = new URLSearchParams({ collection: collectionSlug, slug, secret });
    return `${serverURL}/preview?${params.toString()}`;
  },
  // Acceptance criterion 11: publishing, updating, deleting or renaming a
  // page/article invalidates its cache tags, and a slug change invalidates
  // both the old and new document tags plus creates a 301. The URL shape
  // (`pagePath`/`articlePath`) and the `revalidateTag` call are TUYBA/Next.js
  // specifics, so they're injected here rather than living in `@nero/cms-core`.
  cacheAndRedirects: {
    locale: "en",
    pathFor: ({ collectionSlug, slug }) =>
      collectionSlug === "articles" ? articlePath(slug) : pagePath(slug),
    invalidate: invalidateCacheTags,
  },
});
