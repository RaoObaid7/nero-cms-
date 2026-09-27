import { type NextRequest, NextResponse } from "next/server";
import { getPayloadClient } from "@/lib/get-payload-client";
import { parseYoastRedirectCsv, parseSeoPressCsv, RedirectParseError } from "@nero/cms-core";
import type { ParsedRedirect } from "@nero/cms-core";

const MAX_FILE_BYTES = 512 * 1024;
const ALLOWED_FORMATS = ["yoast", "seopress"] as const;
type Format = (typeof ALLOWED_FORMATS)[number];

async function isAdmin(req: NextRequest): Promise<boolean> {
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
    return Boolean(result?.user?.roles?.includes("admin"));
  } catch {
    return false;
  }
}

/**
 * SEO-121: Redirect import endpoint.
 *
 * POST /api/redirect-import (multipart/form-data)
 * Fields: file (CSV), format ("yoast"|"seopress"), dryRun ("true"|"false"), siteUrl (optional)
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const format = (formData.get("format") ?? "yoast") as string;
  const dryRun = formData.get("dryRun") !== "false";
  const siteUrl = (formData.get("siteUrl") as string | null) ?? "";

  if (!file) return NextResponse.json({ error: '"file" is required.' }, { status: 400 });
  if (!ALLOWED_FORMATS.includes(format as Format)) {
    return NextResponse.json({ error: '"format" must be "yoast" or "seopress".' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_FILE_BYTES / 1024} KB limit.` },
      { status: 413 },
    );
  }

  const csv = await file.text();
  let parsed: ParsedRedirect[];
  try {
    parsed =
      format === "seopress" ? parseSeoPressCsv(csv, siteUrl) : parseYoastRedirectCsv(csv, siteUrl);
  } catch (err) {
    const msg = err instanceof RedirectParseError ? err.message : "Failed to parse CSV.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  const payload = await getPayloadClient();
  const existingResult = await payload.find({
    collection: "redirects",
    limit: 0,
    overrideAccess: true,
  });
  const existingSources = new Set(
    (existingResult.docs as unknown as Array<Record<string, unknown>>).map((d) =>
      String(d.from ?? ""),
    ),
  );

  const conflicts: ParsedRedirect[] = [];
  const toInsert: ParsedRedirect[] = [];
  for (const row of parsed) {
    if (existingSources.has(row.from)) {
      conflicts.push(row);
    } else {
      toInsert.push(row);
    }
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      total: parsed.length,
      toInsert: toInsert.length,
      conflicts,
    });
  }

  let inserted = 0;
  for (const row of toInsert) {
    try {
      // sourceType is a new field; types will align after next generate:types run
      await (payload as unknown as { create: (args: unknown) => Promise<void> }).create({
        collection: "redirects",
        data: { from: row.from, to: row.to, type: row.type, sourceType: "path" },
        overrideAccess: true,
      });
      inserted++;
    } catch (err) {
      // skip duplicates that slipped through the in-memory check
      payload.logger.warn(`redirect-import: could not insert ${row.from}: ${err}`);
    }
  }

  return NextResponse.json({ applied: true, inserted, conflicts });
}
