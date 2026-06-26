import { type NextRequest } from "next/server";
import { withAbility, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { feedbackPosts } from "@/lib/db/schema";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

const listQuerySchema = z.object({
  status: z.enum(["open", "planned", "in_progress", "completed", "declined"]).optional(),
  search: z.string().trim().min(1).optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(["open", "planned", "in_progress", "completed", "declined"]).default("open"),
  category: z.string().trim().max(100).optional(),
  submittedByName: z.string().trim().max(120).optional(),
  submittedByEmail: z.string().trim().email().optional(),
  linkedRoadmapItemId: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  return withAbility("view", "projects:roadmap", async (session) => {
    const { status, search } = parseQuery(req, listQuerySchema);

    const conditions = [eq(feedbackPosts.orgId, session.orgId)];
    if (status) conditions.push(eq(feedbackPosts.status, status));
    if (search) {
      const term = `%${search}%`;
      const match = or(ilike(feedbackPosts.title, term), ilike(feedbackPosts.description, term));
      if (match) conditions.push(match);
    }

    const posts = await db.query.feedbackPosts.findMany({
      where: and(...conditions),
      orderBy: [desc(feedbackPosts.votes), asc(feedbackPosts.id)],
    });

    return ok(posts);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "projects:roadmap", async (session) => {
    const input = await parseBody(req, createSchema);

    const [post] = await db
      .insert(feedbackPosts)
      .values({
        orgId: session.orgId,
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        category: input.category ?? null,
        submittedByName: input.submittedByName ?? null,
        submittedByEmail: input.submittedByEmail ?? null,
        linkedRoadmapItemId: input.linkedRoadmapItemId ?? null,
        createdBy: session.user.id,
      })
      .returning();

    return ok(post, 201);
  });
}
