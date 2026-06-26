import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { scorecardTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const criterionSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(100),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  criteria: z.array(criterionSchema).min(1),
  isBlindMode: z.boolean().optional(),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const templates = await db.query.scorecardTemplates.findMany({
      where: eq(scorecardTemplates.orgId, session.orgId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    return ok(templates);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, createTemplateSchema);

    const [template] = await db
      .insert(scorecardTemplates)
      .values({
        orgId: session.orgId,
        name: body.name,
        criteria: body.criteria,
        createdBy: session.user.id,
      })
      .returning();

    return ok(template, 201);
  });
}
