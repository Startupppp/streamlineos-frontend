import * as dotenv from "dotenv";
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";

dotenv.config({ path: ".env" });

const OWNER_EMAIL = process.env.PLATFORM_OWNER_EMAIL || "adityachalla01@gmail.com";
const OWNER_NAME = process.env.PLATFORM_OWNER_NAME || "Aditya";
const OWNER_PASSWORD = process.env.PLATFORM_OWNER_PASSWORD || "ChangeMe@2026";

async function main() {
  const { db } = await import("../lib/db");
  const { users, organizations, organizationMembers } = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");

  console.log("[platform-owner] Checking for existing owner…");
  const existing = await db.query.users.findFirst({
    where: eq(users.email, OWNER_EMAIL),
  });

  let userId: string;
  let resetPassword = false;
  if (existing) {
    userId = existing.id;
    const passwordHash = await hash(OWNER_PASSWORD, 12);
    await db
      .update(users)
      .set({
        role: "PLATFORM_OWNER",
        password: passwordHash,
        isActive: true,
        hasDashboardAccess: true,
        isPasswordChangeRequired: false,
      })
      .where(eq(users.id, userId));
    resetPassword = true;
    console.log(`[platform-owner] Updated existing user → role: PLATFORM_OWNER (${OWNER_EMAIL})`);
  } else {
    userId = `user_${nanoid()}`;
    const passwordHash = await hash(OWNER_PASSWORD, 12);
    await db.insert(users).values({
      id: userId,
      email: OWNER_EMAIL,
      name: OWNER_NAME,
      firstName: OWNER_NAME.split(" ")[0],
      lastName: OWNER_NAME.split(" ").slice(1).join(" ") || null,
      password: passwordHash,
      role: "PLATFORM_OWNER",
      isActive: true,
      hasDashboardAccess: true,
      isPasswordChangeRequired: false,
      emailVerified: new Date(),
    });
    resetPassword = true;
    console.log(`[platform-owner] Created new user: ${OWNER_EMAIL}`);
  }

  // Optional: attach to the default StreamlineOS org so org-scoped queries don't fail.
  const defaultOrg = await db.query.organizations.findFirst({
    where: eq(organizations.slug, "streamlineos-capital"),
  });
  if (defaultOrg) {
    const link = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });
    if (!link) {
      await db.insert(organizationMembers).values({
        userId,
        orgId: defaultOrg.id,
        role: "PLATFORM_OWNER",
      }).onConflictDoNothing();
    }
  }

  console.log("");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("  ✓ Platform owner ready");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`    Email:    ${OWNER_EMAIL}`);
  if (resetPassword) {
    console.log(`    Password: ${OWNER_PASSWORD}   ← change it after first sign-in`);
  } else {
    console.log("    Password: (existing — unchanged)");
  }
  console.log("    Sign in:  http://localhost:3000/signin");
  console.log("    Lands at: /owner");
  console.log("─────────────────────────────────────────────────────────────");

  process.exit(0);
}

main().catch((err) => {
  console.error("[platform-owner] error:", err);
  process.exit(1);
});
