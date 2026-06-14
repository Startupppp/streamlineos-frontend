import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { client } = await import("../lib/db");

  console.log("[migrate] Adding missing columns…");

  const alters = [
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_size TEXT`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country TEXT`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_doc_status TEXT NOT NULL DEFAULT 'PENDING'`,
    `DROP TYPE IF EXISTS dm_lead_status CASCADE`,
    `DROP TYPE IF EXISTS social_platform CASCADE`,
  ];

  for (const sql of alters) {
    try {
      await client.unsafe(sql);
      const col = sql.match(/ADD COLUMN IF NOT EXISTS (\S+)/)?.[1] ?? sql;
      console.log(`  ✓ ${col}`);
    } catch (err) {
      console.warn(`  ⚠ ${sql}`, err);
    }
  }

  console.log("[migrate] Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[migrate] error:", err);
  process.exit(1);
});
