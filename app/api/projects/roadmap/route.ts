import { type NextRequest } from "next/server";
import { withAbility, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { roadmapItems } from "@/lib/db/schema";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

const listQuerySchema = z.object({
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
  search: z.string().trim().min(1).optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]).default("planned"),
  category: z.string().trim().max(100).optional(),
  isPublic: z.boolean().default(true),
  projectId: z.number().int().positive().optional(),
  epicTicketId: z.number().int().positive().optional(),
  targetQuarter: z.string().trim().max(20).optional(),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  return withAbility("view", "projects:roadmap", async (session) => {
    const { status, search } = parseQuery(req, listQuerySchema);

    const conditions = [eq(roadmapItems.orgId, session.orgId)];
    if (status) conditions.push(eq(roadmapItems.status, status));
    if (search) {
      const term = `%${search}%`;
      const match = or(ilike(roadmapItems.title, term), ilike(roadmapItems.description, term));
      if (match) conditions.push(match);
    }

    const items = await db.query.roadmapItems.findMany({
      where: and(...conditions),
      orderBy: [asc(roadmapItems.sortOrder), asc(roadmapItems.id)],
    });

    return ok(items);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "projects:roadmap", async (session) => {
    const input = await parseBody(req, createSchema);

    const [item] = await db
      .insert(roadmapItems)
      .values({
        orgId: session.orgId,
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        category: input.category ?? null,
        isPublic: input.isPublic,
        projectId: input.projectId ?? null,
        epicTicketId: input.epicTicketId ?? null,
        targetQuarter: input.targetQuarter ?? null,
        sortOrder: input.sortOrder,
        createdBy: session.user.id,
      })
      .returning();

    return ok(item, 201);
  });
}
