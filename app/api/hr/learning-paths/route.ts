import { withAuth, ok, err, parseQuery, parseBody } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { learningPaths } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetRole: z.string().max(100).optional(),
  steps: z.array(z.object({
    order: z.number().int().min(1),
    type: z.enum(["training", "assessment", "certification"]),
    referenceId: z.number().int().positive(),
    title: z.string().min(1),
  })).min(1),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { limit } = parseQuery(req, listSchema);
    const data = await db.query.learningPaths.findMany({
      where: eq(learningPaths.orgId, session.orgId),
      orderBy: [desc(learningPaths.createdAt)],
      limit,
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:performance"))  return err("Only admins can create learning paths.", 403);
    const body = await parseBody(req, createSchema);
    const [path] = await db.insert(learningPaths).values({
      orgId: session.orgId,
      title: body.title,
      description: body.description,
      targetRole: body.targetRole,
      steps: body.steps,
      createdBy: session.user.id,
    }).returning();
    return ok(path, 201);
  });
}
