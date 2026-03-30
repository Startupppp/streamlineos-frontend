import { attendance } from "./lib/db/schema";
import { db } from "./lib/db"; // Assuming a db instance
import { desc } from "drizzle-orm";

async function test() {
  await db.transaction(async (tx) => {
    const res = await tx.select().from(attendance).orderBy(desc(attendance.id)).limit(1).for('update');
    console.log(res);
  });
}
