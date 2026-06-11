import "server-only";
import { db } from "@/lib/db";
import { indianStates } from "@/lib/db/schema/accounting";
import { INDIAN_STATES } from "@/lib/accounting/indian-states";

export async function seedIndianStates() {
  for (const row of INDIAN_STATES) {
    await db.insert(indianStates).values({ ...row, gstStateCode: row.stateCode }).onConflictDoNothing();
  }
}
