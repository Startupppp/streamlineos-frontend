import { withAuth, withAbility, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { handbookVersions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const VERSION_FORMAT = /^[a-zA-Z0-9][a-zA-Z0-9._\-]*$/;
const CONSECUTIVE_PERIODS = /\.{2,}/;

const createSchema = z.object({
  version: z
    .string()
    .min(1, "Version is required")
    .max(20, "Version must be at most 20 characters")
    .regex(VERSION_FORMAT, "Version must start with a letter or digit and contain only letters, digits, dots, underscores, or hyphens")
    .refine((v) => !CONSECUTIVE_PERIODS.test(v), "Version must not contain consecutive periods"),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be at most 200 characters")
    .refine((v) => /[a-zA-Z]/.test(v), "Title must contain at least one letter")
    .refine((v) => !/  /.test(v), "Title must not contain consecutive spaces")
    .refine((v) => v === v.trim(), "Title must not have leading or trailing spaces"),
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
    const body = createSchema.parse(await req.json());

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
