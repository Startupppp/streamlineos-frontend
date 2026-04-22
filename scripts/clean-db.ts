import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function clean() {
  const { db } = await import("../lib/db");
  const { sql } = await import("drizzle-orm");

  const tables = await db.execute(sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `);

  const tableNames = tables
    .map((t) => `"${String((t as Record<string, unknown>).tablename)}"`)
    .join(", ");
  if (tableNames) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${tableNames} CASCADE`));
  }

  process.exit(0);
}

clean().catch((e) => {
  console.error(e);
  process.exit(1);
});


