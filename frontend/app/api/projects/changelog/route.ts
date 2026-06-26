import { type NextRequest } from "next/server";
import { withAbility, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { changelogEntries } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

const listQuerySchema = z.object({
  type: z.enum(["feature", "improvement", "fix"]).optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().max(20000).default(""),
  version: z.string().trim().max(40).optional(),
  type: z.enum(["feature", "improvement", "fix"]).default("feature"),
  isPublished: z.boolean().default(false),
  linkedRoadmapItemId: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  return withAbility("view", "projects:roadmap", async (session) => {
    const { type } = parseQuery(req, listQuerySchema);

    const conditions = [eq(changelogEntries.orgId, session.orgId)];
    if (type) conditions.push(eq(changelogEntries.type, type));

    const entries = await db.query.changelogEntries.findMany({
      where: and(...conditions),
      orderBy: [desc(changelogEntries.createdAt), desc(changelogEntries.id)],
    });

    return ok(entries);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "projects:roadmap", async (session) => {
    const input = await parseBody(req, createSchema);

    const [entry] = await db
      .insert(changelogEntries)
      .values({
        orgId: session.orgId,
        title: input.title,
        content: input.content,
        version: input.version ?? null,
        type: input.type,
        isPublished: input.isPublished,
        linkedRoadmapItemId: input.linkedRoadmapItemId ?? null,
        publishedAt: input.isPublished ? new Date() : null,
        createdBy: session.user.id,
      })
      .returning();

    return ok(entry, 201);
  });
}
