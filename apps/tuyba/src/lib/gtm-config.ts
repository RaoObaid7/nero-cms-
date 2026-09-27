import { getPayloadClient } from "./get-payload-client";

export interface GtmConfig {
  enabled: boolean;
  containerId: string | null;
}

/**
 * Resolves the effective GTM configuration at request time.
 *
 * Priority: GTM_CONTAINER_ID environment variable > database value.
 * The environment variable lets staging and production use different containers
 * without sharing the same database record.
 *
 * Returns `enabled: false` when the emergency disable switch is on.
 */
export async function getGtmConfig(): Promise<GtmConfig> {
  const disabled: GtmConfig = { enabled: false, containerId: null };

  try {
    const payload = await getPayloadClient();
    type GtmSettingsGlobal = {
      enabled?: boolean;
      emergencyDisable?: boolean;
      containerId?: string | null;
    };
    const settings = await (
      payload.findGlobal as (args: {
        slug: string;
        overrideAccess: boolean;
      }) => Promise<GtmSettingsGlobal | null>
    )({
      slug: "gtm-settings",
      overrideAccess: true,
    });

    if (!settings?.enabled || settings?.emergencyDisable) return disabled;

    const envId = process.env.GTM_CONTAINER_ID;
    const dbId = typeof settings?.containerId === "string" ? settings.containerId : null;
    const containerId = envId || dbId;

    if (!containerId) return disabled;
    if (!/^GTM-[A-Z0-9]{4,8}$/.test(containerId)) return disabled;

    return { enabled: true, containerId };
  } catch {
    return disabled;
  }
}
