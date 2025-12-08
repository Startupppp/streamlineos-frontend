import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
console.log("Testing connection to:", url?.replace(/:[^:]*@/, ":****@")); // Hide password

if (!url) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function test() {
  try {
    const result = await sql`SELECT 1 as result`;
    console.log("Connection successful!", result);
  } catch (e) {
    console.error("Connection failed:", e);
  } finally {
    await sql.end();
  }
}

test();
