import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { redis } = await import("../lib/redis");

  if (!redis) {
    console.error("[invalidate-user-sessions] Redis is not configured. Nothing to do.");
    process.exit(0);
  }

  console.log("[invalidate-user-sessions] Scanning for user:session:* keys…");

  let cursor: string = "0";
  let total = 0;

  do {
    const result = (await redis.scan(cursor, {
      match: "user:session:*",
      count: 500,
    })) as [string, string[]];

    cursor = Array.isArray(result) ? result[0] : "0";
    const keys = Array.isArray(result) ? result[1] : [];

    if (keys.length > 0) {
      await redis.del(...keys);
      total += keys.length;
      process.stdout.write(`\r[invalidate-user-sessions] Deleted ${total} key(s)…`);
    }
  } while (cursor !== "0");

  console.log(`\n[invalidate-user-sessions] Done. ${total} user-session cache key(s) deleted.`);
  console.log("[invalidate-user-sessions] Users will fetch fresh role/permission data on their next request — no re-login required.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[invalidate-user-sessions] Failed:", err);
  process.exit(1);
});
