/**
 * Local-only helper: seeds one published page (with blocks), one published
 * article with taxonomy, and one unpublished draft, so the public routes can be
 * inspected with real content. Not part of the test suite.
 */
import { getPayload } from "payload";
import type { Payload } from "payload";
import config from "../src/payload.config";

/** Idempotent: re-running the seed must not fail on unique slugs. */
async function upsertBySlug(
  payload: Payload,
  collection: string,
  slug: string,
  data: Record<string, unknown>,
  draft = false,
): Promise<{ id: string | number }> {
  const existing = await payload.find({
    collection: collection as never,
    where: { slug: { equals: slug } },
    overrideAccess: true,
    draft: true,
    limit: 1,
  });
  const found = existing.docs[0] as { id: string | number } | undefined;
  if (found) {
    const updated = await payload.update({
      collection: collection as never,
      id: found.id,
      overrideAccess: true,
      draft,
      data: data as never,
    });
    return updated as { id: string | number };
  }
  const created = await payload.create({
    collection: collection as never,
    overrideAccess: true,
    draft,
    data: data as never,
  });
  return created as { id: string | number };
}

async function main(): Promise<void> {
  const payload = await getPayload({ config });

  const category = await upsertBySlug(payload, "categories", "umrah-guides", {
    name: "Umrah Guides",
    slug: "umrah-guides",
    description: "Planning an umrah trip.",
  });

  const tag = await upsertBySlug(payload, "tags", "family-travel", {
    name: "Family Travel",
    slug: "family-travel",
  });

  await upsertBySlug(payload, "pages", "about", {
    title: "About TUYBA",
    slug: "about",
    _status: "published",
    layout: [
      {
        blockType: "hero",
        heading: "Travel that respects your values",
        subheading:
          "Halal-certified hotels, verified prayer facilities, and family-friendly stays.",
        cta: { label: "Browse packages", href: "/blog" },
      },
      {
        blockType: "faq",
        items: [
          {
            question: "How are hotels verified?",
            answer: "Each property is reviewed against our suitability checklist before listing.",
          },
          {
            question: "Can I book for a family?",
            answer: "Yes — family rooms and adjoining options are marked on every listing.",
          },
        ],
      },
      {
        blockType: "cta",
        heading: "Ready to plan your trip?",
        body: "Tell us your dates and we will suggest suitable options.",
        actions: [{ label: "Get in touch", href: "/contact" }],
      },
    ],
  });

  await upsertBySlug(payload, "articles", "choosing-a-hotel-near-the-haram", {
    title: "Choosing a hotel near the Haram",
    slug: "choosing-a-hotel-near-the-haram",
    _status: "published",
    excerpt: "What to look for when distance, prayer times and family space all matter.",
    primaryCategory: category.id,
    tags: [tag.id],
    layout: [
      {
        blockType: "callout",
        variant: "info",
        text: "Walking distance matters more than star rating during peak season.",
      },
    ],
  });

  await upsertBySlug(
    payload,
    "pages",
    "unannounced-partnership",
    {
      title: "Unannounced Partnership",
      slug: "unannounced-partnership",
      _status: "draft",
    },
    true,
  );

  process.stdout.write(
    "seeded: /about, /blog/choosing-a-hotel-near-the-haram, draft /unannounced-partnership\n",
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  const detail = (error as { data?: { errors?: unknown } })?.data?.errors;
  console.error("FAILED:", (error as Error)?.message);
  console.error(
    "DETAIL:",
    JSON.stringify(detail ?? (error as { cause?: unknown })?.cause, null, 2),
  );
  process.exit(1);
});
