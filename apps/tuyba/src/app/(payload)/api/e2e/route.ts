import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publishScheduledContent } from "@nero/cms-core";
import { getPayloadClient } from "@/lib/get-payload-client";

/**
 * Test-only control surface for the E2E suite: seeding an admin user,
 * creating fixture documents, and running the scheduler — all through the
 * same running server process Playwright drives in the browser, so Payload
 * config loads exactly the way it does at runtime (Next's own module
 * resolution), unlike importing `payload.config.ts` directly from the
 * Playwright test runner's own loader, which fails on this project's
 * extensionless `next/constants` import (verified directly: the test runner
 * throws "Cannot find module .../next/constants", Next itself does not).
 *
 * Locked down two ways: it 404s unless `E2E_TEST_MODE=true` (only ever set
 * by `playwright.config.ts`'s `webServer.env`, never in a normal build/start
 * or in production), AND unless the caller presents the matching
 * `E2E_TEST_SECRET` header — so even a deployment that accidentally left the
 * mode flag on still requires the secret. Indistinguishable from a
 * nonexistent route to anyone without both.
 */
const ENABLED = process.env.E2E_TEST_MODE === "true";

function authorized(request: NextRequest): boolean {
  const secret = process.env.E2E_TEST_SECRET;
  if (!ENABLED || !secret) return false;
  return request.headers.get("x-e2e-secret") === secret;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = (await request.json()) as { action?: string; [key: string]: unknown };
  const payload = await getPayloadClient();

  switch (body.action) {
    case "ensure-admin": {
      const { email, password } = body as { email: string; password: string };
      const existing = await payload.find({
        collection: "users",
        where: { email: { equals: email } },
        overrideAccess: true,
      });
      if (existing.docs[0]) {
        await payload.update({
          collection: "users",
          id: existing.docs[0].id,
          overrideAccess: true,
          data: { password } as never,
        });
      } else {
        await payload.create({
          collection: "users",
          overrideAccess: true,
          data: { email, password, roles: ["admin"] },
        });
      }
      return NextResponse.json({ ok: true });
    }

    case "create-page": {
      const { data, draft } = body as { data: Record<string, unknown>; draft?: boolean };
      const doc = await payload.create({
        collection: "pages",
        overrideAccess: true,
        draft: Boolean(draft),
        data: data as never,
      });
      return NextResponse.json({ ok: true, doc });
    }

    case "update-page": {
      const { id, data, draft } = body as {
        id: string | number;
        data: Record<string, unknown>;
        draft?: boolean;
      };
      const doc = await payload.update({
        collection: "pages",
        id,
        overrideAccess: true,
        draft: Boolean(draft),
        data: data as never,
      });
      return NextResponse.json({ ok: true, doc });
    }

    case "create-redirect": {
      const { data } = body as { data: Record<string, unknown> };
      const doc = await payload.create({
        collection: "redirects",
        overrideAccess: true,
        data: data as never,
      });
      return NextResponse.json({ ok: true, doc });
    }

    case "create-article": {
      const { data, draft } = body as { data: Record<string, unknown>; draft?: boolean };
      const doc = await payload.create({
        collection: "articles",
        overrideAccess: true,
        draft: Boolean(draft),
        data: data as never,
      });
      return NextResponse.json({ ok: true, doc });
    }

    case "create-category": {
      const { data } = body as { data: Record<string, unknown> };
      const doc = await payload.create({
        collection: "categories",
        overrideAccess: true,
        data: data as never,
      });
      return NextResponse.json({ ok: true, doc });
    }

    case "run-scheduler": {
      const results = await publishScheduledContent(payload);
      return NextResponse.json({ ok: true, results });
    }

    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}
