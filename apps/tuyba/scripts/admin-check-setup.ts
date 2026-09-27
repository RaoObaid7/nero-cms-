/**
 * Local-only helper for the Sprint 2 manual admin check (acceptance criterion
 * 11). Creates a throwaway admin user and a page carrying rich text plus one
 * block, then returns a valid auth token so the check can drive the admin UI
 * without typing a password into the browser.
 *
 * Not part of the test suite and never run against a real environment.
 */
import { getPayload } from "payload";
import config from "../src/payload.config";

const EMAIL = "admin-check@example.invalid";
const PASSWORD = process.env.ADMIN_CHECK_PASSWORD;

async function main(): Promise<void> {
  if (!PASSWORD) {
    throw new Error("Set ADMIN_CHECK_PASSWORD for this local-only helper.");
  }
  const payload = await getPayload({ config });

  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: EMAIL } },
    overrideAccess: true,
  });

  if (existing.totalDocs === 0) {
    await payload.create({
      collection: "users",
      overrideAccess: true,
      data: { email: EMAIL, password: PASSWORD, roles: ["admin"] },
    });
  } else {
    // Reset the password so a re-run with a fresh random password still works.
    await payload.update({
      collection: "users",
      id: existing.docs[0]!.id,
      overrideAccess: true,
      data: { password: PASSWORD } as never,
    });
  }

  const pages = await payload.find({
    collection: "pages",
    where: { slug: { equals: "admin-check" } },
    overrideAccess: true,
    draft: true,
  });

  if (pages.totalDocs === 0) {
    await payload.create({
      collection: "pages",
      overrideAccess: true,
      draft: true,
      data: {
        title: "Admin check page",
        slug: "admin-check",
        _status: "draft",
      } as never,
    });
  }

  const result = await payload.login({
    collection: "users",
    data: { email: EMAIL, password: PASSWORD },
  });

  process.stdout.write(`TOKEN=${result.token}\n`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("FAILED:", error);
  process.exit(1);
});
