import * as dotenv from "dotenv";
import { sql } from "drizzle-orm";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");

  console.log("[drop-qr-codes-table] Checking for qr_codes table…");

  const exists = await db.execute(sql`
    SELECT to_regclass('public.qr_codes') AS table_oid;
  `);
  const row = (exists as unknown as { rows: { table_oid: string | null }[] }).rows?.[0];
  const tableOid = row?.table_oid ?? null;

  if (!tableOid) {
    console.log("[drop-qr-codes-table] Table 'qr_codes' does not exist. Nothing to do.");
    process.exit(0);
  }

  const [{ count }] = await db
    .execute(sql`SELECT COUNT(*)::int AS count FROM qr_codes;`)
    .then((r) => (r as unknown as { rows: { count: number }[] }).rows);

  console.log(`[drop-qr-codes-table] Found ${count} row(s) in qr_codes.`);
  console.log("[drop-qr-codes-table] Dropping table…");

  await db.execute(sql`DROP TABLE IF EXISTS qr_codes CASCADE;`);

  console.log("[drop-qr-codes-table] Done. Table dropped.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[drop-qr-codes-table] Failed:", err);
  process.exit(1);
});
