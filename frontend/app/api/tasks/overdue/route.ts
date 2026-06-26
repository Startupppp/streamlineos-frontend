import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  countOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { countOnly } = parseQuery(req, querySchema);
    const now = new Date();

    const conditions = [
      eq(tasks.orgId, session.orgId),
      eq(tasks.status, "pending"),
      isNotNull(tasks.dueDate),
      lt(tasks.dueDate, now),
    ];

    if (countOnly) {
      const rows = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(...conditions));
      return ok({ count: rows.length });
    }

    const rows = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(tasks.dueDate)
      .limit(100);

    return ok({ tasks: rows, count: rows.length });
  });
}
