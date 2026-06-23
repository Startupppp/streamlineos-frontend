import { withAuth, withAbility, ok, err, parseBody } from "@/lib/api/helpers"; 
import { db } from "@/lib/db";
import { handbookVersions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const VERSION_FORMAT = /^\d+\.\d+$/;
const CONSECUTIVE_SPECIAL_CHARS = /[^a-zA-Z0-9 ]{2,}/;

const createSchema = z.object({
  version: z
    .string()
    .min(1, "Version is required")
    .max(10, "Version must be at most 10 characters")
    .regex(VERSION_FORMAT, "Version must be in MAJOR.MINOR format (e.g., 1.0, 2.3)"),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must be at most 100 characters")
    .refine((v) => v.length > 0, "Title is required")
    .refine((v) => !/  /.test(v), "Title must not contain consecutive spaces")
    .refine((v) => !CONSECUTIVE_SPECIAL_CHARS.test(v), "Title must not contain consecutive special characters"),
  documentId: z.number().int().positive().optional(),
  documentUrl: z
    .string()
    .url("Document URL must be a valid URL")
    .startsWith("https://", "Document URL must start with https://")
    .optional(),
  changelog: z.string().max(2000).optional(),
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
    const body = await parseBody(req, createSchema);

    const existing = await db.query.handbookVersions.findFirst({
      where: and(
        eq(handbookVersions.orgId, session.orgId),
        eq(handbookVersions.title, body.title),
        eq(handbookVersions.version, body.version),
      ),
      columns: { id: true },
    });
    if (existing) {
      return err(`A handbook version "${body.version}" with title "${body.title}" already exists.`, 409);
    }

    const [record] = await db
      .insert(handbookVersions)
      .values({
        orgId: session.orgId,
        version: body.version,
        title: body.title,
        documentId: body.documentId ?? null,
        documentUrl: body.documentUrl ?? null,
        changelog: body.changelog ?? null,
        publishedAt: null,
        publishedBy: null,
      })
      .returning();

    return ok(record, 201);
  });
}
