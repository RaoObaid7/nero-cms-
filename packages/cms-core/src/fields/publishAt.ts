import type { DateField } from "payload";

/**
 * Shared `publishAt` field for schedulable collections (`Pages`, `Articles`).
 * The field alone is only a timestamp; `enforceScheduledPublish` is what
 * actually keeps a document draft until its `publishAt` time, and
 * `publishScheduledContent` is what flips it to published once due.
 */
export const publishAtField: DateField = {
  name: "publishAt",
  type: "date",
  admin: {
    position: "sidebar",
    date: { pickerAppearance: "dayAndTime" },
    description:
      "Schedule for later (optional). Leave blank to publish immediately when you click Publish.",
  },
};
