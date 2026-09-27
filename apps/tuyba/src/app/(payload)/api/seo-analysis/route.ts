import { type NextRequest, NextResponse } from "next/server";
import { getPayloadClient } from "@/lib/get-payload-client";
import { extractDocumentText, buildSeoChecklist } from "@nero/cms-core";

/**
 * SEO analysis endpoint (GET /api/seo-analysis?id=<id>&collection=pages|articles).
 * Admin/editor only (checked via Payload's auth header). Returns checklist
 * JSON. Never cached — analysis reads the latest saved document.
 */
export const dynamic = "force-dynamic";

async function resolveUser(req: NextRequest): Promise<boolean> {
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
    const roles: string[] = result?.user?.roles ?? [];
    return roles.includes("admin") || roles.includes("editor");
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const authorized = await resolveUser(req);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const collection = searchParams.get("collection");

  if (!id || (collection !== "pages" && collection !== "articles")) {
    return NextResponse.json(
      { error: "id and collection=pages|articles are required" },
      { status: 400 },
    );
  }

  const payload = await getPayloadClient();
  const doc = (await payload.findByID({
    collection: collection as "pages" | "articles",
    id,
    depth: 1,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>;

  const extracted = extractDocumentText(doc);
  const seo = doc.seo as Record<string, unknown> | null | undefined;
  const focusKeyword = typeof seo?.focusKeyword === "string" ? seo.focusKeyword : "";
  const additionalRaw = typeof seo?.additionalKeywords === "string" ? seo.additionalKeywords : "";
  const keywords = [
    ...(focusKeyword ? [focusKeyword] : []),
    ...additionalRaw
      .split(",")
      .map((k: string) => k.trim())
      .filter(Boolean),
  ];

  const checklist = buildSeoChecklist(extracted, keywords);

  return NextResponse.json(
    {
      checklist,
      extracted: {
        title: extracted.title,
        slug: extracted.slug,
        wordCount: extracted.body.split(" ").filter(Boolean).length,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
