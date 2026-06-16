import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roadmapItems, feedbackPosts, changelogEntries, organizations } from "@/lib/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  org: z.string().trim().min(1),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const orgId = parsed.data.org;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { id: true, name: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const [items, posts, changelog] = await Promise.all([
    db.query.roadmapItems.findMany({
      where: and(eq(roadmapItems.orgId, orgId), eq(roadmapItems.isPublic, true)),
      columns: {
        id: true,
        title: true,
        description: true,
        status: true,
        category: true,
        targetQuarter: true,
        votes: true,
      },
      orderBy: [asc(roadmapItems.sortOrder), desc(roadmapItems.votes), asc(roadmapItems.id)],
    }),
    db.query.feedbackPosts.findMany({
      where: and(eq(feedbackPosts.orgId, orgId), eq(feedbackPosts.status, "open")),
      columns: {
        id: true,
        title: true,
        description: true,
        category: true,
        votes: true,
        createdAt: true,
      },
      orderBy: [desc(feedbackPosts.votes), desc(feedbackPosts.createdAt)],
    }),
    db.query.changelogEntries.findMany({
      where: and(eq(changelogEntries.orgId, orgId), eq(changelogEntries.isPublished, true)),
      columns: {
        id: true,
        title: true,
        content: true,
        version: true,
        type: true,
        publishedAt: true,
      },
      orderBy: [desc(changelogEntries.publishedAt), desc(changelogEntries.id)],
    }),
  ]);

  return NextResponse.json({
    orgName: org.name,
    roadmap: {
      planned: items.filter((i) => i.status === "planned"),
      in_progress: items.filter((i) => i.status === "in_progress"),
      completed: items.filter((i) => i.status === "completed"),
    },
    feedback: posts,
    changelog,
  });
}
