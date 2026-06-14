import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { feedbackPosts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(["open", "planned", "in_progress", "completed", "declined"]).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  linkedRoadmapItemId: z.number().int().positive().nullable().optional(),
});

type RouteContext = { params: Promise<{ postId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "projects:roadmap", async (session) => {
    const { postId: idStr } = await ctx.params;
    const postId = Number(idStr);
    if (!Number.isFinite(postId)) return err("Invalid post ID", 400);

    const post = await db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.orgId, session.orgId)),
    });
    if (!post) return err("Feedback post not found", 404);

    return ok(post);
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:roadmap", async (session) => {
    const { postId: idStr } = await ctx.params;
    const postId = Number(idStr);
    if (!Number.isFinite(postId)) return err("Invalid post ID", 400);

    const input = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(feedbackPosts)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(feedbackPosts.id, postId), eq(feedbackPosts.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Feedback post not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:roadmap", async (session) => {
    const { postId: idStr } = await ctx.params;
    const postId = Number(idStr);
    if (!Number.isFinite(postId)) return err("Invalid post ID", 400);

    const [deleted] = await db
      .delete(feedbackPosts)
      .where(and(eq(feedbackPosts.id, postId), eq(feedbackPosts.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Feedback post not found", 404);
    return ok({ success: true });
  });
}
