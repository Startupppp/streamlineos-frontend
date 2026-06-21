import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { richDocuments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createRichDocumentSchema = z.object({
  title: z.string(),
  templateType: z.string().optional(),
  contentJson: z.unknown().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.richDocuments.findMany({
      where: eq(richDocuments.orgId, session.orgId),
      orderBy: [desc(richDocuments.updatedAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createRichDocumentSchema);

    if (!body.title) return err("title is required.", 400);

    const [doc] = await db
      .insert(richDocuments)
      .values({
        orgId: session.orgId,
        title: body.title,
        templateType: body.templateType,
        contentJson: body.contentJson,
        createdBy: session.user.id,
        isPublished: false,
        version: 1,
      })
      .returning();

    return ok(doc, 201);
  });
}
