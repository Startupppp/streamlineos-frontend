import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");
  const { organizationMembers, organizations } = await import("../lib/db/schema");
  const { eq, and, asc } = await import("drizzle-orm");

  console.log("[backfill-org-owners] Scanning organizations…");
  const orgs = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
  console.log(`[backfill-org-owners] Found ${orgs.length} org(s).`);

  let updated = 0;
  let alreadyOwned = 0;

  for (const org of orgs) {
    const owners = await db
      .select({ id: organizationMembers.id, userId: organizationMembers.userId, isOwner: organizationMembers.isOwner })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, org.id), eq(organizationMembers.isOwner, true)))
      .limit(1);

    if (owners.length > 0) {
      alreadyOwned++;
      continue;
    }

    const earliest = await db
      .select({ id: organizationMembers.id, userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.orgId, org.id))
      .orderBy(asc(organizationMembers.joinedAt))
      .limit(1);

    if (earliest.length === 0) {
      console.log(`[backfill-org-owners] Org "${org.name}" has no members. Skipping.`);
      continue;
    }

    await db
      .update(organizationMembers)
      .set({ isOwner: true })
      .where(eq(organizationMembers.id, earliest[0].id));

    console.log(`[backfill-org-owners] Org "${org.name}" → owner = ${earliest[0].userId}`);
    updated++;
  }

  console.log(`[backfill-org-owners] Done. Updated: ${updated}, already had owner: ${alreadyOwned}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[backfill-org-owners] Failed:", err);
  process.exit(1);
});
