import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function main() {
  const { client } = await import("../lib/db");

  await client.unsafe(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
      LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);

  console.log("Database cleared successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Clear DB failed:", err);
  process.exit(1);
});
