import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { client } = await import("../lib/db");

  const result = await client`
    SELECT typname FROM pg_type
    WHERE typtype = 'e'
    ORDER BY typname
  `;

  console.log("DB enum types:", result.map((r: { typname: string }) => r.typname));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
