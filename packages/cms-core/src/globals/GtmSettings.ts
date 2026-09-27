import type { GlobalConfig } from "payload";
import { isAdmin } from "../access";

/**
 * Google Tag Manager configuration (PRD §9.2 / Sprint 3B §2.1).
 *
 * Container ID is stored here as the CMS-managed default. The consuming app
 * may override it with the `GTM_CONTAINER_ID` environment variable so that
 * staging and production can use different containers without sharing a
 * database, and so the ID never leaks across environments.
 *
 * Version history is enabled so every admin-level change is auditable.
 */
export const GtmSettings: GlobalConfig = {
  slug: "gtm-settings",
  label: "Google Tag Manager",
  admin: {
    description:
      "Google Tag Manager configuration. Changes are restricted to administrators and are fully versioned.",
    group: "Site settings",
  },
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  versions: {
    max: 50,
  },
  fields: [
    {
      name: "enabled",
      type: "checkbox",
      defaultValue: false,
      required: true,
      admin: {
        description:
          "Enable Google Tag Manager on public pages. Disabling this removes the GTM script entirely without requiring a code change.",
      },
    },
    {
      name: "containerId",
      type: "text",
      admin: {
        description:
          "GTM container ID in the form GTM-XXXXXXX. This value is used when the GTM_CONTAINER_ID environment variable is not set. Staging and production environments should set the variable rather than relying on the database value.",
        condition: (data) => Boolean(data?.enabled),
      },
      validate: (value: unknown) => {
        if (!value) return true;
        if (typeof value !== "string" || !/^GTM-[A-Z0-9]{4,8}$/.test(value)) {
          return "Container ID must be in the form GTM-XXXXXXX (GTM- followed by 4-8 uppercase letters or digits).";
        }
        return true;
      },
    },
    {
      name: "emergencyDisable",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Emergency kill switch: when checked, GTM does not load on any public page regardless of the enabled flag. Use this to immediately stop all tag execution without a code deploy.",
        condition: (data) => Boolean(data?.enabled),
      },
    },
  ],
};
