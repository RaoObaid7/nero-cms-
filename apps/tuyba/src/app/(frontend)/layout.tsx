import type { ReactNode } from "react";
import { getGtmConfig } from "@/lib/gtm-config";
import { GtmWrapper } from "@/components/GtmWrapper";
import "../tuyba.css";

export const metadata = {
  title: { default: "TUYBA — Halal Travel Guides", template: "%s | TUYBA" },
  description:
    "Halal-certified stays, prayer facilities and family-first travel guides curated for Muslim families worldwide.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "TUYBA",
  },
};

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const gtm = await getGtmConfig();

  return (
    <html lang="en">
      <body>
        {children}
        {gtm.enabled && gtm.containerId && <GtmWrapper containerId={gtm.containerId} />}
      </body>
    </html>
  );
}
