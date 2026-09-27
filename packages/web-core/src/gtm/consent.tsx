"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "nero_gtm_consent";

type ConsentState = "pending" | "granted" | "denied";

interface ConsentContextValue {
  state: ConsentState;
  grantConsent: () => void;
  denyConsent: () => void;
  withdrawConsent: () => void;
}

const ConsentContext = createContext<ConsentContextValue>({
  state: "pending",
  grantConsent: () => {},
  denyConsent: () => {},
  withdrawConsent: () => {},
});

function readStoredConsent(): ConsentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "granted" || raw === "denied") return raw;
  } catch {
    // localStorage unavailable (e.g. private mode, SSR)
  }
  return "pending";
}

function writeConsent(state: ConsentState): void {
  try {
    if (state === "pending") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, state);
    }
  } catch {
    // ignore
  }
}

/**
 * Google Consent Mode v2 signals. Called whenever consent state changes so
 * GTM picks up the new state even if the container was already loaded.
 */
function updateConsentMode(state: ConsentState): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  const granted = state === "granted";
  w.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
    functionality_storage: granted ? "granted" : "denied",
    personalization_storage: granted ? "granted" : "denied",
    security_storage: "granted",
  });
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConsentState>("pending");

  useEffect(() => {
    setState(readStoredConsent());
  }, []);

  const grantConsent = useCallback(() => {
    setState("granted");
    writeConsent("granted");
    updateConsentMode("granted");
  }, []);

  const denyConsent = useCallback(() => {
    setState("denied");
    writeConsent("denied");
    updateConsentMode("denied");
  }, []);

  const withdrawConsent = useCallback(() => {
    setState("pending");
    writeConsent("pending");
    updateConsentMode("denied");
  }, []);

  return (
    <ConsentContext.Provider value={{ state, grantConsent, denyConsent, withdrawConsent }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  return useContext(ConsentContext);
}
