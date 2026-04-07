import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { richDocuments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

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
    const body = await req.json() as {
      title: string;
      templateType?: string;
      contentJson?: unknown;
    };

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

    return ok(doc);
  });
}
