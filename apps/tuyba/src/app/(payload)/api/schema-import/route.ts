import { type NextRequest, NextResponse } from "next/server";
import { getPayloadClient } from "@/lib/get-payload-client";
import { validateJsonLd } from "@nero/cms-core";

const MAX_BODY_BYTES = 32 * 1024;
const ALLOWED_COLLECTIONS = ["pages", "articles"] as const;

async function isEditorOrAdmin(req: NextRequest): Promise<boolean> {
  try {
    const payload = await getPayloadClient();
    const authHeader = req.headers.get("Authorization");
    const cookie = req.headers.get("cookie") ?? "";
    const result = (await (
      payload as unknown as {
        auth(args: { headers: Headers }): Promise<{ user?: { roles?: string[] } } | null>;
      }
    ).auth({
      headers: new Headers({ Authorization: authHeader ?? "", cookie }),
    })) as { user?: { roles?: string[] } } | null;
    const roles = result?.user?.roles ?? [];
    return roles.includes("admin") || roles.includes("editor");
  } catch {
    return false;
  }
}

/**
 * SEO-114: Schema import endpoint.
 *
 * POST /api/schema-import
 * Body: { schema: object, collection: "pages"|"articles", id: string, dryRun?: boolean }
 *
 * Validates the schema structurally and, on confirmation (?apply=true),
 * writes it to the document's `customSchema` field.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isEditorOrAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `Request body exceeds ${MAX_BODY_BYTES / 1024} KB limit.` },
      { status: 413 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { schema, collection, id, dryRun = true } = body;

  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return NextResponse.json({ error: '"schema" must be a JSON object.' }, { status: 400 });
  }
  if (!ALLOWED_COLLECTIONS.includes(collection as (typeof ALLOWED_COLLECTIONS)[number])) {
    return NextResponse.json(
      { error: '"collection" must be "pages" or "articles".' },
      { status: 400 },
    );
  }
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: '"id" is required.' }, { status: 400 });
  }

  const errors = validateJsonLd(schema);

  if (dryRun) {
    return NextResponse.json({ dryRun: true, valid: errors.length === 0, errors });
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Schema validation failed. Run with dryRun: true to see errors.", errors },
      { status: 422 },
    );
  }

  const payload = await getPayloadClient();
  // customSchema is a new field; types will align after next generate:types run
  await (payload as unknown as { update: (args: unknown) => Promise<void> }).update({
    collection: collection as "pages" | "articles",
    id,
    data: { customSchema: JSON.stringify(schema, null, 2) },
    overrideAccess: true,
  });

  return NextResponse.json({ applied: true, errors: [] });
}
