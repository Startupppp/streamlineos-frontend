import { withAuth, withAbility, ok, parseQuery, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { alumniProfiles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const createSchema = z.object({
  userId: z.string().min(1),
  currentCompany: z.string().optional(),
  currentRole: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  email: z.string().email().optional(),
  leftDate: z.string().optional(),
  isOptedIn: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { limit } = parseQuery(req, listSchema);
    const data = await db
      .select()
      .from(alumniProfiles)
      .where(eq(alumniProfiles.orgId, session.orgId))
      .orderBy(desc(alumniProfiles.createdAt))
      .limit(limit);

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("read", "hr:alumni", async (session) => {
    const body = await parseBody(req, createSchema);

    const [record] = await db
      .insert(alumniProfiles)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        currentCompany: body.currentCompany ?? null,
        currentRole: body.currentRole ?? null,
        linkedinUrl: body.linkedinUrl ?? null,
        email: body.email ?? null,
        leftDate: body.leftDate ?? null,
        isOptedIn: body.isOptedIn ?? true,
      })
      .returning();

    return ok(record, 201);
  });
}
