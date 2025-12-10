/**
 * Script to fix orphaned data before schema migration
 * This removes records that reference non-existent organizations
 */

import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env" });

async function fixOrphanedData() {
  console.log("🔍 Checking for orphaned data...");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  // Use direct postgres connection for this script
  const sqlClient = postgres(databaseUrl);

  try {
    // Get all organization IDs
    const orgs = await sqlClient`SELECT id FROM organizations`;
    const orgIds = orgs.map((row: any) => row.id);

    if (orgIds.length === 0) {
      console.log("⚠️  No organizations found. Creating a default organization...");
      // Create a default organization
      await sqlClient`
        INSERT INTO organizations (id, name, slug, created_at, updated_at) 
        VALUES ('default-org', 'Default Organization', 'default-org', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      console.log("✅ Default organization created");
      // Re-fetch org IDs after creating default
      const updatedOrgs = await sqlClient`SELECT id FROM organizations`;
      orgIds.push(...updatedOrgs.map((row: any) => row.id));
    }

    console.log(`📊 Found ${orgIds.length} organization(s)`);

    // Find orphaned records - order matters due to foreign key constraints
    // Delete child records first, then parent records
    const tables = [
      // Child tables first
      "leave_requests",        // References leave_types
      "leave_balances",       // References leave_types
      "sprints",              // References projects
      "tickets",              // References projects
      "timesheets",           // References projects
      "ticket_attachments",  // References tickets
      "ticket_comments",      // References tickets
      "ticket_label_mappings", // References tickets
      "goals",                // References projects
      "helpdesk_tickets",     // References projects
      // Then parent tables
      "leave_types",
      "projects",
      "attendance",
      "payrolls",
      "salary_structures",
      "expenses",
      "assets",
      "documents",
      "performance_reviews",
      "departments",
      "user_permissions",
    ];

    let totalDeleted = 0;

    for (const table of tables) {
      try {
        // Build SQL query with proper parameterization
        const placeholders = orgIds.map((_, i) => `$${i + 1}`).join(",");
        const query = `SELECT COUNT(*)::int as count FROM ${table} WHERE org_id NOT IN (${placeholders})`;
        
        // Check if table exists and has org_id column
        const result = await sqlClient.unsafe(query, orgIds);
        const count = result[0]?.count || 0;

        if (count > 0) {
          console.log(`🗑️  Deleting ${count} orphaned record(s) from ${table}...`);
          const deleteQuery = `DELETE FROM ${table} WHERE org_id NOT IN (${placeholders})`;
          await sqlClient.unsafe(deleteQuery, orgIds);
          totalDeleted += count;
        }
      } catch (error: any) {
        // Table might not exist or might not have org_id column
        if (!error.message.includes("does not exist") && !error.message.includes("column") && !error.message.includes("org_id")) {
          console.warn(`⚠️  Error checking ${table}:`, error.message);
        }
      }
    }

    // Handle role_permissions separately (org_id can be NULL)
    try {
      const placeholders = orgIds.map((_, i) => `$${i + 1}`).join(",");
      const query = `SELECT COUNT(*)::int as count FROM role_permissions WHERE org_id IS NOT NULL AND org_id NOT IN (${placeholders})`;
      const result = await sqlClient.unsafe(query, orgIds);
      const count = result[0]?.count || 0;
      if (count > 0) {
        console.log(`🗑️  Deleting ${count} orphaned record(s) from role_permissions...`);
        const deleteQuery = `DELETE FROM role_permissions WHERE org_id IS NOT NULL AND org_id NOT IN (${placeholders})`;
        await sqlClient.unsafe(deleteQuery, orgIds);
        totalDeleted += count;
      }
    } catch (error: any) {
      if (!error.message.includes("does not exist")) {
        console.warn(`⚠️  Error checking role_permissions:`, error.message);
      }
    }

    console.log(`✅ Cleanup complete! Deleted ${totalDeleted} orphaned record(s)`);
    await sqlClient.end();
  } catch (error) {
    console.error("❌ Error fixing orphaned data:", error);
    await sqlClient.end();
    process.exit(1);
  }
}

fixOrphanedData()
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
