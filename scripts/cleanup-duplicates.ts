
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function main() {
  console.log("🧹 Starting duplicate cleanup...");
  
  // Dynamic import
  const { db } = await import("../lib/db");
  const { organizationMembers } = await import("../lib/db/schema");
  const { inArray } = await import("drizzle-orm");

  // 1. Identify duplicates in organization_members
  // We want to find (user_id, org_id) pairs that appear more than once
  
  const allMembers = await db.query.organizationMembers.findMany();
  
  const seenStr = new Set<string>();
  const duplicateIds: number[] = [];

  for (const mem of allMembers) {
      const key = `${mem.userId}-${mem.orgId}`;
      if (seenStr.has(key)) {
          // duplicate
          duplicateIds.push(mem.id);
      } else {
          seenStr.add(key);
      }
  }

  if (duplicateIds.length === 0) {
      console.log("✅ No duplicate memberships found.");
  } else {
      console.log(`🗑️ Found ${duplicateIds.length} duplicate membership records.`);
      await db.delete(organizationMembers)
        .where(inArray(organizationMembers.id, duplicateIds));
      console.log("✅ Duplicates modified/removed.");
  }

  console.log("✅ Cleanup complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
