import { withAuth, withAbility, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { handbookVersions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  version: z.string().min(1, "Version is required"),
  documentId: z.number().int().positive().optional(),
  changelog: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db
      .select()
      .from(handbookVersions)
      .where(eq(handbookVersions.orgId, session.orgId))
      .orderBy(desc(handbookVersions.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "hr:handbook", async (session) => {
    const body = createSchema.parse(await req.json());

    const [record] = await db
      .insert(handbookVersions)
      .values({
        orgId: session.orgId,
        version: body.version,
        documentId: body.documentId ?? null,
        changelog: body.changelog ?? null,
        publishedAt: null,
        publishedBy: null,
      })
      .returning();

    return ok(record, 201);
  });
}
