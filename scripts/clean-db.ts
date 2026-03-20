import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function clean() {
  const { db } = await import("../lib/db");
  const { sql } = await import("drizzle-orm");

  // Get all table names
  const tables = await db.execute(sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `);

  console.log("Tables found:", tables.map((t: any) => t.tablename));

  // Truncate all tables in one shot
  const tableNames = tables.map((t: any) => `"${t.tablename}"`).join(", ");
  if (tableNames) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${tableNames} CASCADE`));
  }

  console.log("All tables cleaned!");
  process.exit(0);
}

clean().catch((e) => {
  console.error(e);
  process.exit(1);
});
