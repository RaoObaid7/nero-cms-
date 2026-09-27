/**
 * Runs the scheduled-publish job once: flips every due (`_status: draft`,
 * `publishAt` in the past) page/article to published. Bounded and idempotent
 * — see `publishScheduledContent` in `@nero/cms-core` — so this is safe to
 * invoke repeatedly from a cron entry or an external scheduler (PRD 10.3
 * requires a real job runner, not an in-process timer). Not part of the test
 * suite; requires a live database.
 */
import { getPayload } from "payload";
import { publishScheduledContent } from "@nero/cms-core";
import config from "../src/payload.config";

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const results = await publishScheduledContent(payload);

  await new Promise<void>((resolve) => {
    process.stdout.write(`OK: published ${results.length} due document(s)\n`, () => resolve());
  });
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("FAILED:", error);
  process.exit(1);
});
