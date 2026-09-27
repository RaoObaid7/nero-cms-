"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "./consent";
import { pushPageView } from "./dataLayer";

export interface GtmLoaderProps {
  containerId: string;
}

/**
 * Injects the GTM script once and fires page_view on every client-side
 * navigation. The module-private `__gtm_loaded` sentinel on `window` prevents
 * a second injection if the component re-mounts (e.g. during HMR or a layout
 * remount). Consent must be granted before the script is inserted.
 *
 * The application owns the page_view event; the GTM container must not also
 * fire it via a history-change trigger — that would duplicate events.
 */
export function GtmLoader({ containerId }: GtmLoaderProps) {
  const { state } = useConsent();
  const loadedRef = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (state !== "granted") return;
    if (typeof window === "undefined") return;
    if (window.__gtm_loaded) return;
    if (loadedRef.current) return;

    loadedRef.current = true;
    window.__gtm_loaded = true;

    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
    document.head.appendChild(script);
  }, [state, containerId]);

  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (state !== "granted") return;
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;
    pushPageView(pathname);
  }, [pathname, state]);

  return null;
}
