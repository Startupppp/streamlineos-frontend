import { type NextRequest } from "next/server";
import { withAbility, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { playbookEntries } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(80).optional(),
  content: z.string().max(10000).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  return withAbility("view", "sales", async (session) => {
    const entries = await db
      .select()
      .from(playbookEntries)
      .where(eq(playbookEntries.orgId, session.orgId))
      .orderBy(asc(playbookEntries.sortOrder), asc(playbookEntries.id));

    return ok(entries);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "sales", async (session) => {
    const input = await parseBody(req, createSchema);

    const [entry] = await db
      .insert(playbookEntries)
      .values({
        orgId: session.orgId,
        title: input.title,
        category: input.category?.trim() || null,
        content: input.content ?? "",
        sortOrder: input.sortOrder ?? 0,
        createdBy: session.user.id,
      })
      .returning();

    return ok(entry, 201);
  });
}
