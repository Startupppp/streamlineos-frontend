import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { appraisalCategories } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  return withAuth(async () => {
    const rows = await db.select().from(appraisalCategories).orderBy(asc(appraisalCategories.sortOrder));
    return ok(rows);
  });
}
