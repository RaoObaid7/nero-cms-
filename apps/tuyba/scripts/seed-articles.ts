/**
 * seed-articles.ts
 *
 * Populates the database with a rich set of articles covering every
 * publishing state and Sprint 3B field so you can walk through the
 * complete editorial workflow without touching real content.
 *
 * Run:  pnpm --filter @nero/tuyba seed:articles
 *
 * Re-running is idempotent: existing slugs are updated in-place.
 */
import { getPayload } from "payload";
import type { Payload } from "payload";
import config from "../src/payload.config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function upsert(
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
    return (await payload.update({
      collection: collection as never,
      id: found.id,
      overrideAccess: true,
      draft,
      data: data as never,
    })) as { id: string | number };
  }
  return (await payload.create({
    collection: collection as never,
    overrideAccess: true,
    draft,
    data: data as never,
  })) as { id: string | number };
}

/** Minimal Lexical root node wrapping plain paragraph text. */
function lexicalBody(...paragraphs: string[]) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      direction: "ltr",
      version: 1,
      children: paragraphs.map((text) => ({
        type: "paragraph",
        format: "",
        indent: 0,
        direction: "ltr",
        version: 1,
        children: [
          {
            type: "text",
            format: 0,
            detail: 0,
            mode: "normal",
            style: "",
            text,
            version: 1,
          },
        ],
      })),
    },
  };
}

/** Lexical body with headings mixed in — better for SEO checklist testing. */
function lexicalArticle(sections: Array<{ heading?: string; body: string }>) {
  const children: unknown[] = [];
  for (const s of sections) {
    if (s.heading) {
      children.push({
        type: "heading",
        tag: "h2",
        format: "",
        indent: 0,
        direction: "ltr",
        version: 1,
        children: [
          {
            type: "text",
            format: 0,
            detail: 0,
            mode: "normal",
            style: "",
            text: s.heading,
            version: 1,
          },
        ],
      });
    }
    children.push({
      type: "paragraph",
      format: "",
      indent: 0,
      direction: "ltr",
      version: 1,
      children: [
        { type: "text", format: 0, detail: 0, mode: "normal", style: "", text: s.body, version: 1 },
      ],
    });
  }
  return { root: { type: "root", format: "", indent: 0, direction: "ltr", version: 1, children } };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const payload = await getPayload({ config });

  // ── Taxonomy ──────────────────────────────────────────────────────────────
  const catGuides = await upsert(payload, "categories", "umrah-guides", {
    name: "Umrah Guides",
    slug: "umrah-guides",
    description: "Planning, packing and performing Umrah.",
  });

  const catTravel = await upsert(payload, "categories", "halal-travel", {
    name: "Halal Travel",
    slug: "halal-travel",
    description: "Finding halal options wherever you go.",
  });

  const catPodcast = await upsert(payload, "categories", "podcast", {
    name: "Podcast",
    slug: "podcast",
    description: "Audio episodes from the TUYBA show.",
  });

  // ── Find or create an author ───────────────────────────────────────────────
  const usersResult = await payload.find({
    collection: "users",
    limit: 1,
    overrideAccess: true,
  });
  const authorId = (usersResult.docs[0] as { id: string | number } | undefined)?.id;
  if (!authorId) {
    console.error("No user found. Create an admin account first via /admin.");
    process.exit(1);
  }

  // ── Article 1: Published, full Sprint 3B fields ───────────────────────────
  await upsert(payload, "articles", "choosing-hotel-near-haram", {
    title: "Choosing a Hotel Near the Haram: Everything You Need to Know",
    slug: "choosing-hotel-near-haram",
    _status: "published",
    excerpt:
      "Distance, prayer times and family space all matter — here is how to balance them without blowing your budget.",
    author: authorId,
    primaryCategory: catGuides.id,
    additionalCategories: [catTravel.id],
    tags: "Family Travel, First-Time Pilgrims",
    body: lexicalArticle([
      {
        heading: "Why location is everything",
        body: "Staying within 500 metres of the Masjid al-Haram means you can walk to every Fajr prayer, even in the rain. Every extra minute of walking adds up across the days of your stay.",
      },
      {
        heading: "What to look for in a halal-certified property",
        body: "Ask specifically about alcohol-free policies, gender-segregated pool hours, and whether the restaurant offers halal-certified kitchens — not just halal menus.",
      },
      {
        heading: "Family considerations",
        body: "Families should prioritise interconnecting rooms and ground-floor prayer facilities. A hotel that looks perfect on the map may have no lift and eight flights of stairs.",
      },
      {
        heading: "Booking timing",
        body: "Prices in Makkah can rise tenfold in the final two weeks before Ramadan. Book at least four months in advance if your dates overlap with any peak period.",
      },
    ]),
    layout: [
      {
        blockType: "callout",
        variant: "info",
        text: "Use the TUYBA distance filter to show only hotels within a 10-minute walk of the Haram entrance.",
      },
      {
        blockType: "faq",
        items: [
          {
            question: "What is the best area to stay near the Haram?",
            answer:
              "The Ajyad district offers the closest walking distance on the Zamzam Tower side, with many options at varying price points.",
          },
          {
            question: "Are there halal-only hotel chains?",
            answer:
              "Yes — several Gulf-based chains operate fully halal properties with no alcohol on the premises and gender-segregated facilities.",
          },
        ],
      },
    ],
    // Sprint 3B SEO fields
    seo: {
      metaTitle: "Best Hotels Near Haram | TUYBA Halal Travel Guide",
      metaDescription:
        "Find the perfect hotel near Masjid al-Haram. Compare walking distance, halal certification and family rooms in our updated 2026 guide.",
      noindex: false,
      nofollow: false,
      focusKeyword: "hotel near haram",
      additionalKeywords: "halal hotel makkah, family hotel near kaaba, haram hotel distance",
    },
  });

  // ── Article 2: Draft (editor can publish it) ───────────────────────────────
  await upsert(
    payload,
    "articles",
    "budget-umrah-tips-draft",
    {
      title: "10 Ways to Do Umrah on a Budget (Draft)",
      slug: "budget-umrah-tips-draft",
      _status: "draft",
      excerpt: "You do not need to spend a fortune to have a spiritually meaningful Umrah.",
      author: authorId,
      primaryCategory: catGuides.id,
      tags: "Budget Tips, First-Time Pilgrims",
      body: lexicalBody(
        "Traveling for Umrah does not have to break the bank. With careful planning and the right tools, a meaningful journey is achievable at almost any budget.",
        "Book flights in shoulder season — the period between major holidays — and you can save up to 40% compared to peak Ramadan fares.",
        "Consider four-star hotels 15 minutes from the Haram rather than five-star properties right next door. The savings can fund an extra day in Madinah.",
      ),
      seo: {
        focusKeyword: "budget umrah",
        additionalKeywords: "cheap umrah packages, affordable umrah tips",
        noindex: true, // draft — should not be indexed
      },
    },
    true, // draft: true
  );

  // ── Article 3: Scheduled (publishAt in the future) ────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  await upsert(payload, "articles", "ramadan-travel-guide-2027", {
    title: "The Complete Ramadan Travel Guide for 2027",
    slug: "ramadan-travel-guide-2027",
    _status: "draft",
    publishAt: tomorrow.toISOString(),
    excerpt:
      "Everything pilgrims need to know about travelling during Ramadan — from booking timelines to iftar etiquette.",
    author: authorId,
    primaryCategory: catGuides.id,
    tags: "Family Travel",
    body: lexicalBody(
      "Ramadan travel requires months of lead time and a different mindset from any other trip. This guide covers everything from the moment you decide to go.",
      "Flight prices in the final 10 days of Ramadan — Laylat al-Qadr season — are among the highest of the year. Booking 6 months out is not excessive.",
    ),
    seo: {
      metaTitle: "Ramadan Travel Guide 2027 | TUYBA",
      focusKeyword: "ramadan travel guide",
      noindex: false,
    },
  });

  // ── Article 4: News Article (appears in news sitemap) ─────────────────────
  await upsert(payload, "articles", "tuyba-launches-hotel-comparison-tool", {
    title: "TUYBA Launches Halal Hotel Comparison Tool",
    slug: "tuyba-launches-hotel-comparison-tool",
    _status: "published",
    excerpt:
      "Our new comparison feature lets you rank halal hotels by distance, price and certification — all in one view.",
    author: authorId,
    primaryCategory: catTravel.id,
    tags: "Family Travel",
    newsArticle: true, // Sprint 3B — shows in news sitemap
    body: lexicalBody(
      "TUYBA today launched a side-by-side hotel comparison tool, making it easier than ever to find halal-certified accommodation near Islamic landmarks.",
      "The tool covers over 400 properties across Makkah, Madinah and Istanbul, with more cities being added every quarter.",
      "Filters include walking distance to the nearest mosque, alcohol-free policy confirmation, halal kitchen certification and family room availability.",
    ),
    seo: {
      metaTitle: "TUYBA Launches Halal Hotel Comparison Tool",
      metaDescription:
        "Compare halal hotels by distance, price and certification. TUYBA's new tool covers 400+ properties across key Islamic travel destinations.",
      focusKeyword: "halal hotel comparison",
      noindex: false,
      nofollow: false,
    },
  });

  // ── Article 5: Podcast episode (Sprint 3B podcast fields) ─────────────────
  await upsert(payload, "articles", "ep-12-travelling-with-kids-for-umrah", {
    title: "Ep 12: Travelling with Kids for Umrah",
    slug: "ep-12-travelling-with-kids-for-umrah",
    _status: "published",
    excerpt:
      "Sheikh Nasser and guest Fatima Al-Rashidi discuss practical tips for taking children on Umrah for the first time.",
    author: authorId,
    primaryCategory: catPodcast.id,
    tags: "Family Travel, First-Time Pilgrims",
    // Sprint 3B podcast fields
    isPodcastEpisode: true,
    podcastEpisodeNumber: 12,
    podcastSeason: 2,
    podcastAudioUrl: "https://example.com/podcast/ep12-kids-umrah.mp3",
    body: lexicalBody(
      "In this episode we cover the logistics of flying with children, managing prayer schedules when kids are tired, and how to make the experience meaningful for a six-year-old.",
      "Fatima shares how she prepared her twins for Umrah by building a Kaaba model at home three months before the trip.",
    ),
    seo: {
      metaTitle: "Ep 12: Travelling with Kids for Umrah | TUYBA Podcast",
      metaDescription:
        "Practical tips for taking children on their first Umrah — from packing to prayer schedules.",
      focusKeyword: "umrah with kids",
      additionalKeywords: "family umrah, children umrah tips, kids pilgrimage",
      noindex: false,
    },
  });

  // ── Article 6: Published with custom JSON-LD schema (Sprint 3B SEO-113) ───
  const customSchema = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Perform Umrah Step by Step",
      description: "A complete walkthrough of the Umrah rituals for first-time pilgrims.",
      step: [
        { "@type": "HowToStep", name: "Ihram", text: "Enter the state of Ihram at the Miqat." },
        {
          "@type": "HowToStep",
          name: "Tawaf",
          text: "Circumambulate the Kaaba seven times anticlockwise.",
        },
        { "@type": "HowToStep", name: "Sa'i", text: "Walk seven times between Safa and Marwa." },
        {
          "@type": "HowToStep",
          name: "Halq/Taqsir",
          text: "Shave or trim the hair to exit Ihram.",
        },
      ],
    },
    null,
    2,
  );

  await upsert(payload, "articles", "how-to-perform-umrah-step-by-step", {
    title: "How to Perform Umrah Step by Step",
    slug: "how-to-perform-umrah-step-by-step",
    _status: "published",
    excerpt: "A complete walkthrough of every ritual — from entering Ihram to the final haircut.",
    author: authorId,
    primaryCategory: catGuides.id,
    tags: "First-Time Pilgrims",
    customSchema, // Sprint 3B — overrides generated JSON-LD
    body: lexicalArticle([
      {
        heading: "Step 1: Ihram",
        body: "Before reaching the Miqat (boundary), men change into two white unstitched cloths. Women wear modest clothing in any colour. Niyyah (intention) is made and Talbiyah is recited.",
      },
      {
        heading: "Step 2: Tawaf",
        body: "Upon arriving at the Masjid al-Haram, pilgrims perform seven anticlockwise circuits of the Kaaba, beginning and ending at the Black Stone.",
      },
      {
        heading: "Step 3: Sa'i",
        body: "Walk between the hills of Safa and Marwa seven times, commemorating Hajar's search for water for her son Ismail.",
      },
      {
        heading: "Step 4: Halq or Taqsir",
        body: "Men shave the head completely (Halq) or trim it (Taqsir). Women trim a small amount. This completes the Umrah and the pilgrim exits Ihram.",
      },
    ]),
    seo: {
      metaTitle: "How to Perform Umrah: Complete Step-by-Step Guide",
      metaDescription:
        "Follow our detailed guide through every Umrah ritual — Ihram, Tawaf, Sa'i and the final haircut — with tips for first-time pilgrims.",
      focusKeyword: "how to perform umrah",
      additionalKeywords: "umrah steps, umrah ritual guide, umrah for beginners",
      noindex: false,
    },
  });

  // ── Article 7: Noindexed article (excluded from public SEO) ───────────────
  await upsert(payload, "articles", "internal-style-guide", {
    title: "Internal Style Guide (Not for Public)",
    slug: "internal-style-guide",
    _status: "published",
    excerpt: "Editorial conventions and tone-of-voice notes for the TUYBA content team.",
    author: authorId,
    primaryCategory: catGuides.id,
    body: lexicalBody(
      "This article is published so the CMS serves it, but noindex:true prevents it from appearing in search results.",
      "Use this to test that the SEO overview correctly counts it in the noindexed tally.",
    ),
    seo: {
      noindex: true,
      nofollow: true,
      focusKeyword: "internal style guide",
    },
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n✅ Mock articles seeded:\n");
  console.log("  PUBLISHED:");
  console.log("  → /blog/choosing-hotel-near-haram          (full SEO + blocks + FAQ)");
  console.log("  → /blog/tuyba-launches-hotel-comparison-tool (newsArticle=true, news sitemap)");
  console.log("  → /blog/ep-12-travelling-with-kids-for-umrah (podcast episode, Sprint 3B)");
  console.log("  → /blog/how-to-perform-umrah-step-by-step  (custom JSON-LD schema)");
  console.log("  → /blog/internal-style-guide               (noindex=true)");
  console.log("\n  DRAFT (publish it from the admin):");
  console.log("  → /admin/collections/articles              (search: 'budget umrah tips')");
  console.log("\n  SCHEDULED (auto-publishes tomorrow 09:00):");
  console.log("  → /admin/collections/articles              (search: 'ramadan travel guide 2027')");
  console.log("\n  ADMIN: http://localhost:3000/admin/collections/articles");
  console.log("  PUBLIC: http://localhost:3000/blog\n");

  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("SEED FAILED:", (err as Error)?.message);
  const detail = (err as { data?: { errors?: unknown } })?.data?.errors;
  if (detail) console.error("DETAIL:", JSON.stringify(detail, null, 2));
  process.exit(1);
});
