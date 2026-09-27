import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPayloadClient } from "./lib/get-payload-client";

interface RedirectDoc {
  from: string;
  sourceType?: "path" | "regex";
  priority?: number;
  type: "301" | "302" | "307" | "410" | "451";
  to?: string | null;
}

const REDIRECT_STATUS: Record<RedirectDoc["type"], number> = {
  "301": 301,
  "302": 302,
  "307": 307,
  "410": 410,
  "451": 451,
};

// Compiled regex cache — persists across requests within one process instance.
// Keys are raw pattern strings; values are the compiled RegExp (or null if the
// pattern failed to compile).
const regexCache = new Map<string, RegExp | null>();

function getCompiledRegex(pattern: string): RegExp | null {
  if (regexCache.has(pattern)) return regexCache.get(pattern) ?? null;
  try {
    const re = new RegExp(pattern);
    regexCache.set(pattern, re);
    return re;
  } catch {
    regexCache.set(pattern, null);
    return null;
  }
}

/**
 * SEO-110: redirect manager supporting both exact-path and regex source types.
 *
 * Exact-path redirects are the fast path — a single indexed DB lookup.
 * If no exact match is found, regex redirects are loaded (sorted by priority
 * ascending so lower numbers run first) and tested in order. RegExp instances
 * are compiled once per pattern and cached for the process lifetime.
 *
 * `redirects` is publicly readable, so no `overrideAccess: true` here — a
 * future tightening of the access rule is honored automatically.
 */
async function findRedirect(pathname: string): Promise<RedirectDoc | undefined> {
  const payload = await getPayloadClient();

  try {
    // Fast path: exact match on path-type redirect
    const exactResult = await payload.find({
      collection: "redirects",
      where: {
        and: [{ from: { equals: pathname } }, { sourceType: { not_equals: "regex" } }],
      },
      limit: 1,
      overrideAccess: false,
    });
    if (exactResult.docs.length > 0) return exactResult.docs[0] as RedirectDoc;

    // Slow path: regex redirects in priority order
    const regexResult = await payload.find({
      collection: "redirects",
      where: { sourceType: { equals: "regex" } },
      sort: "priority",
      limit: 200,
      overrideAccess: false,
    });

    for (const doc of regexResult.docs as RedirectDoc[]) {
      const re = getCompiledRegex(doc.from);
      if (re && re.test(pathname)) return doc;
    }
  } catch {
    // Schema migration may be pending; skip redirect lookup rather than 500ing.
  }

  return undefined;
}

/**
 * `/preview` can render draft content, so its responses must never be cached
 * by a shared/public cache (a CDN, a proxy) or indexed — noindex alone is not
 * a security control, but it, plus a hard `no-store`, is the minimum PRD §8
 * requires for preview responses. A page component cannot set arbitrary HTTP
 * response headers itself, so this is done here instead.
 *
 * `Referrer-Policy: no-referrer` matters specifically here: the preview secret
 * travels in the query string, so without it any external image or link in
 * previewed content would leak the full URL — secret included — in the
 * `Referer` header it sends.
 */
function previewResponse(): NextResponse {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname === "/preview") return previewResponse();

  const redirect = await findRedirect(pathname);
  if (redirect) {
    const status = REDIRECT_STATUS[redirect.type] ?? 301;

    if (status === 410 || status === 451) {
      return new NextResponse(null, { status, headers: { "Cache-Control": "public, max-age=60" } });
    }

    if (redirect.to) {
      const response = NextResponse.redirect(new URL(redirect.to, request.url), status);
      response.headers.set("Cache-Control", "public, max-age=60, must-revalidate");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|admin|favicon.ico|sitemap.xml|robots.txt).*)"],
};
