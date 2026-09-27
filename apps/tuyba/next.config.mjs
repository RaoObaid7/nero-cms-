import { withPayload } from "@payloadcms/next/withPayload";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@nero/cms-core", "@nero/web-core", "@nero/ui"],
  // Preview can render draft content, so it must never be cached by a
  // shared/public cache or indexed. `proxy.ts` also sets these, but Next's
  // own dynamic-route default can win the header race for `Cache-Control`;
  // declaring it here too, at the framework config layer, makes sure it wins.
  async headers() {
    return [
      {
        source: "/preview",
        headers: [
          { key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          // The preview secret is in the query string; without this, external
          // resources in previewed content leak the full URL via `Referer`.
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
