import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Admin and preview never serve indexable public content; preview
        // additionally sets `noindex`/`no-store` headers of its own (see
        // `proxy.ts`) — this is the crawl-budget signal, not the security control.
        disallow: ["/admin", "/preview", "/api"],
      },
    ],
    sitemap: `${serverURL}/sitemap.xml`,
  };
}
