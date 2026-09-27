"use client";

import { ConsentProvider, GtmLoader, useConsent } from "@nero/web-core";
import { ConsentBanner } from "@nero/ui";

function GtmConsentBanner() {
  const { state, grantConsent, denyConsent } = useConsent();
  if (state !== "pending") return null;
  return <ConsentBanner onGrant={grantConsent} onDeny={denyConsent} />;
}

export interface GtmWrapperProps {
  containerId: string;
}

export function GtmWrapper({ containerId }: GtmWrapperProps) {
  return (
    <ConsentProvider>
      <GtmLoader containerId={containerId} />
      <GtmConsentBanner />
    </ConsentProvider>
  );
}
