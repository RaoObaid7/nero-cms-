import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  renderBlocks,
  PAGES_COLLECTION,
  collectionCacheTag,
  documentCacheTag,
} from "@nero/web-core";
import type { BlockData } from "@nero/web-core";
import { contentClient } from "@/lib/content-client";
import { cachedRead } from "@/lib/cached-content";
import { blocksRegistry } from "@/lib/blocks-registry";
import { lexicalToHtml } from "@/lib/lexical-html";
import { buildMetadata, breadcrumbSchema, organizationSchema, websiteSchema } from "@/lib/seo";
import type { SeoOverrides } from "@/lib/seo";
import { pagePath } from "@/lib/urls";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";

// Reads through the Payload local API on every request; the read itself is
// cached and tagged (see `cachedRead`), so this only forces a fresh request
// to check for a matching page, not an uncached database read.
export const dynamic = "force-dynamic";

const LOCALE = "en";

interface StandalonePageProps {
  params: Promise<{ slug: string }>;
}

function serverURL(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
}

/**
 * Static sibling segments (`blog/`, `category/[slug]/`, `tag/[slug]/`, plus
 * the separate `(payload)` and `preview` route trees for `/admin` and
 * `/preview`) always win over this dynamic `[slug]` route for their own
 * paths — Next.js resolves a literal path segment before a dynamic one at
 * the same level. This route only ever receives slugs that don't match any
 * of those.
 */
function loadPage(slug: string) {
  return cachedRead(
    ["page", slug],
    [
      collectionCacheTag(PAGES_COLLECTION, LOCALE),
      documentCacheTag(PAGES_COLLECTION, slug, LOCALE),
    ],
    () => contentClient.getPageBySlug(slug),
  );
}

export async function generateMetadata({ params }: StandalonePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) return {};

  return buildMetadata({
    title: typeof page.title === "string" ? page.title : slug,
    path: pagePath(slug),
    seo: page.seo as SeoOverrides | undefined,
    serverURL: serverURL(),
  });
}

export default async function StandalonePage({ params }: StandalonePageProps) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();

  const origin = serverURL();
  const title = typeof page.title === "string" ? page.title : "Untitled";
  const bodyHtml = page.content ? lexicalToHtml(page.content) : "";
  const blocks = Array.isArray(page.layout) ? (page.layout as BlockData[]) : [];
  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: title, path: pagePath(slug) },
  ];

  return (
    <main>
      <JsonLd data={websiteSchema(origin)} />
      <JsonLd data={organizationSchema(origin)} />
      <JsonLd data={breadcrumbSchema(breadcrumbItems, origin)} />
      <Breadcrumbs items={breadcrumbItems} />
      <h1>{title}</h1>
      {bodyHtml ? <div dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : null}
      {renderBlocks(blocks, blocksRegistry)}
    </main>
  );
}
