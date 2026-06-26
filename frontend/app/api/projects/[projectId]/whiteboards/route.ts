import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectWhiteboards, projects } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
});

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!project) return err("Project not found", 404);

    const boards = await db.query.projectWhiteboards.findMany({
      where: and(
        eq(projectWhiteboards.projectId, projectId),
        eq(projectWhiteboards.orgId, session.orgId),
      ),
      orderBy: [desc(projectWhiteboards.updatedAt)],
      columns: { id: true, name: true, data: true, updatedAt: true },
    });

    const summaries = boards.map((board) => ({
      id: board.id,
      name: board.name,
      elementCount: board.data.length,
      updatedAt: board.updatedAt,
    }));

    return ok(summaries);
  });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!project) return err("Project not found", 404);

    const input = await parseBody(req, createSchema);

    const [board] = await db
      .insert(projectWhiteboards)
      .values({
        projectId,
        orgId: session.orgId,
        name: input.name,
        data: [],
        createdBy: session.user.id,
      })
      .returning();

    return ok(board, 201);
  });
}
