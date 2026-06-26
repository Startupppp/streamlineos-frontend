import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roadmapItems, roadmapVotes, feedbackPosts, feedbackVotes } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  org: z.string().trim().min(1),
});

const bodySchema = z.object({
  type: z.enum(["roadmap", "feedback"]),
  id: z.number().int().positive(),
  voterKey: z.string().trim().min(8).max(100),
});

export async function POST(req: NextRequest) {
  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const orgId = parsedQuery.data.org;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsedBody = bodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const { type, id, voterKey } = parsedBody.data;

  if (type === "roadmap") {
    const item = await db.query.roadmapItems.findFirst({
      where: and(eq(roadmapItems.id, id), eq(roadmapItems.orgId, orgId), eq(roadmapItems.isPublic, true)),
      columns: { id: true },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const votes = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(roadmapVotes)
        .values({ orgId, roadmapItemId: id, voterKey })
        .onConflictDoNothing({ target: [roadmapVotes.roadmapItemId, roadmapVotes.voterKey] })
        .returning({ id: roadmapVotes.id });

      if (inserted.length > 0) {
        const [row] = await tx
          .update(roadmapItems)
          .set({ votes: sql`${roadmapItems.votes} + 1` })
          .where(eq(roadmapItems.id, id))
          .returning({ votes: roadmapItems.votes });
        return row?.votes ?? 0;
      }

      const current = await tx.query.roadmapItems.findFirst({
        where: eq(roadmapItems.id, id),
        columns: { votes: true },
      });
      return current?.votes ?? 0;
    });

    return NextResponse.json({ id, type, votes, voted: true });
  }

  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, id), eq(feedbackPosts.orgId, orgId), eq(feedbackPosts.status, "open")),
    columns: { id: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const votes = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(feedbackVotes)
      .values({ orgId, feedbackPostId: id, voterKey })
      .onConflictDoNothing({ target: [feedbackVotes.feedbackPostId, feedbackVotes.voterKey] })
      .returning({ id: feedbackVotes.id });

    if (inserted.length > 0) {
      const [row] = await tx
        .update(feedbackPosts)
        .set({ votes: sql`${feedbackPosts.votes} + 1` })
        .where(eq(feedbackPosts.id, id))
        .returning({ votes: feedbackPosts.votes });
      return row?.votes ?? 0;
    }

    const current = await tx.query.feedbackPosts.findFirst({
      where: eq(feedbackPosts.id, id),
      columns: { votes: true },
    });
    return current?.votes ?? 0;
  });

  return NextResponse.json({ id, type, votes, voted: true });
}
