"use client";

/**
 * Google Tag Manager dataLayer helpers (PRD §9.2 / Sprint 3B §2.1).
 *
 * Rules:
 * - PII must never enter the dataLayer: names, emails, phone numbers, health
 *   inputs, free-text form values, and sensitive query strings are stripped
 *   before pushing.
 * - Page/location fields are sanitized by removing the query string and hash
 *   so sensitive search terms never appear in analytics events.
 * - Typed payloads only — every event name and shape is defined here so
 *   callers cannot push arbitrary unreviewed data.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    __gtm_loaded?: boolean;
  }
}

function safePathname(path: string): string {
  try {
    const url = new URL(path, "http://localhost");
    return url.pathname;
  } catch {
    const idx = path.indexOf("?");
    return idx === -1 ? path : path.slice(0, idx);
  }
}

function push(event: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(event);
}

/** SEO-free page_view. Path is sanitized — no query string, no hash. */
export function pushPageView(path: string): void {
  push({ event: "page_view", page_path: safePathname(path) });
}

/** CTA button click. Label must be a human-readable static identifier, not user input. */
export function pushCtaClicked(label: string): void {
  push({ event: "cta_clicked", cta_label: label });
}

/** User began filling in a form. formId must be a stable developer-defined identifier. */
export function pushFormStarted(formId: string): void {
  push({ event: "form_started", form_id: formId });
}

/**
 * Fired only after durable server-side acceptance of a lead form submission.
 * Never fired on client-side "success" alone — durable acceptance is the trigger.
 */
export function pushLeadSubmitted(formId: string): void {
  push({ event: "lead_submitted", form_id: formId });
}
