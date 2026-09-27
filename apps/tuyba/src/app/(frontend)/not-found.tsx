import { headers } from "next/headers";
import { getPayloadClient } from "@/lib/get-payload-client";
import { sanitizePath } from "@nero/cms-core";
import Link from "next/link";

/**
 * SEO-111: Log 404 events to the `not-found-events` collection, then render a
 * user-facing page. Runs as a React Server Component so it can call Payload
 * directly without an API round-trip.
 */
async function log404(path: string, referrer: string, userAgent: string): Promise<void> {
  try {
    const payload = await getPayloadClient();
    // not-found-events is a new collection; types will align after next generate:types run
    const p = payload as unknown as {
      find: (args: unknown) => Promise<{ docs: Array<{ id: string | number; count?: number }> }>;
      update: (args: unknown) => Promise<void>;
      create: (args: unknown) => Promise<void>;
    };
    const existing = await p.find({
      collection: "not-found-events",
      where: { path: { equals: path } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      const doc = existing.docs[0]!;
      await p.update({
        collection: "not-found-events",
        id: doc.id,
        data: { count: (doc.count ?? 1) + 1 },
        overrideAccess: true,
      });
    } else {
      await p.create({
        collection: "not-found-events",
        data: {
          path,
          referrer: referrer.slice(0, 500),
          userAgent: userAgent.slice(0, 200),
          count: 1,
        },
        overrideAccess: true,
      });
    }
  } catch {
    // Never throw from a 404 page — logging is best-effort
  }
}

export default async function NotFound() {
  const headersList = await headers();
  const rawPath = headersList.get("x-invoke-path") ?? headersList.get("x-url") ?? "/";
  const referrer = headersList.get("referer") ?? "";
  const userAgent = headersList.get("user-agent") ?? "";
  const path = sanitizePath(rawPath);

  await log404(path, referrer, userAgent);

  return (
    <main style={{ padding: "4rem", textAlign: "center" }}>
      <h1>404 — Page not found</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Link href="/">Return home</Link>
    </main>
  );
}
