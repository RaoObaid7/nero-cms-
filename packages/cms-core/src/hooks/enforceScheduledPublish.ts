import type { CollectionBeforeChangeHook } from "payload";

/**
 * `publishAt` is otherwise informational: Payload flips `_status` to
 * `published` the moment an editor clicks "Publish", regardless of any future
 * date stored on the document. This hook is what actually defers that
 * transition — if `_status` is being set to `published` while `publishAt` is
 * still in the future, it forces the document back to `draft` so the
 * scheduler (`publishScheduledContent`) is the one that publishes it once due.
 *
 * The scheduler's own update must bypass this, or it could never flip the
 * status it exists to flip — it does so by passing
 * `context: { allowScheduledPublish: true }`.
 */
export const enforceScheduledPublish: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  context,
}) => {
  if (context.allowScheduledPublish === true) return data;
  if (data._status !== "published") return data;

  const publishAt = data.publishAt ?? originalDoc?.publishAt;
  if (!publishAt) return data;

  const publishTime = new Date(publishAt).getTime();
  if (Number.isNaN(publishTime) || publishTime <= Date.now()) return data;

  return { ...data, _status: "draft" };
};
