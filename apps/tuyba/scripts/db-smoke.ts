/**
 * Smoke check: boots Payload against the compose PostgreSQL database and
 * verifies the adapter connects and can serve a query. Not part of the test
 * suite; run manually or in CI with a database available.
 */
import { getPayload } from "payload";
import config from "../src/payload.config";

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const result = await payload.find({ collection: "pages", limit: 1, overrideAccess: false });
  // Flush stdout before exiting; `process.exit` can truncate a piped write.
  await new Promise<void>((resolve) => {
    process.stdout.write(
      `OK: postgres adapter initialized, pages query returned ${result.totalDocs} docs\n`,
      () => resolve(),
    );
  });
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("FAILED:", error);
  process.exit(1);
});
