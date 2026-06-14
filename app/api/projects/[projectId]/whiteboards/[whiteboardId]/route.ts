import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectWhiteboards, projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const elementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["note", "rect", "ellipse", "text"]),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  text: z.string(),
  color: z.string().min(1).max(32),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    data: z.array(elementSchema).optional(),
  })
  .refine((value) => value.name !== undefined || value.data !== undefined, {
    message: "Provide name or data to update",
  });

type RouteContext = { params: Promise<{ projectId: string; whiteboardId: string }> };

type ResolvedBoard =
  | { ok: true; projectId: number; whiteboardId: number }
  | { ok: false; response: ReturnType<typeof err> };

async function resolveBoardId(ctx: RouteContext, orgId: string): Promise<ResolvedBoard> {
  const { projectId: projectIdStr, whiteboardId: idStr } = await ctx.params;
  const projectId = Number(projectIdStr);
  const whiteboardId = Number(idStr);
  if (!Number.isFinite(projectId) || !Number.isFinite(whiteboardId)) {
    return { ok: false, response: err("Invalid identifier", 400) };
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.orgId, orgId)),
    columns: { id: true },
  });
  if (!project) return { ok: false, response: err("Project not found", 404) };

  return { ok: true, projectId, whiteboardId };
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const resolved = await resolveBoardId(ctx, session.orgId);
    if (!resolved.ok) return resolved.response;

    const board = await db.query.projectWhiteboards.findFirst({
      where: and(
        eq(projectWhiteboards.id, resolved.whiteboardId),
        eq(projectWhiteboards.projectId, resolved.projectId),
        eq(projectWhiteboards.orgId, session.orgId),
      ),
    });

    if (!board) return err("Whiteboard not found", 404);
    return ok(board);
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const resolved = await resolveBoardId(ctx, session.orgId);
    if (!resolved.ok) return resolved.response;

    const input = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(projectWhiteboards)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.data !== undefined ? { data: input.data } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectWhiteboards.id, resolved.whiteboardId),
          eq(projectWhiteboards.projectId, resolved.projectId),
          eq(projectWhiteboards.orgId, session.orgId),
        ),
      )
      .returning();

    if (!updated) return err("Whiteboard not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const resolved = await resolveBoardId(ctx, session.orgId);
    if (!resolved.ok) return resolved.response;

    const [deleted] = await db
      .delete(projectWhiteboards)
      .where(
        and(
          eq(projectWhiteboards.id, resolved.whiteboardId),
          eq(projectWhiteboards.projectId, resolved.projectId),
          eq(projectWhiteboards.orgId, session.orgId),
        ),
      )
      .returning();

    if (!deleted) return err("Whiteboard not found", 404);
    return ok({ success: true });
  });
}
