import { type NextRequest } from "next/server";
import { withAbility, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { supportMacros } from "@/lib/db/schema";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  body: z.string().trim().min(1, "Body is required").max(10000),
  category: z.string().trim().max(100).optional(),
});

export async function GET(req: NextRequest) {
  return withAbility("view", "support:macros", async (session) => {
    const category = req.nextUrl.searchParams.get("category")?.trim();
    const search = req.nextUrl.searchParams.get("search")?.trim();

    const conditions = [eq(supportMacros.orgId, session.orgId)];
    if (category) conditions.push(eq(supportMacros.category, category));
    if (search) {
      const term = `%${search}%`;
      const match = or(ilike(supportMacros.title, term), ilike(supportMacros.body, term));
      if (match) conditions.push(match);
    }

    const macros = await db.query.supportMacros.findMany({
      where: and(...conditions),
      orderBy: [asc(supportMacros.title)],
    });

    return ok(macros);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "support:macros", async (session) => {
    const input = await parseBody(req, createSchema);

    const [macro] = await db
      .insert(supportMacros)
      .values({
        orgId: session.orgId,
        title: input.title,
        body: input.body,
        category: input.category ?? null,
        createdBy: session.user.id,
      })
      .returning();

    return ok(macro, 201);
  });
}
