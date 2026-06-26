import { withAuth, withAbility, ok, err, parseQuery, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { alumniProfiles, organizationMembers, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const createSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  currentCompany: z.string().max(100).optional(),
  currentRole: z.string().max(100).optional(),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  leftDate: z.string().optional(),
  isOptedIn: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { limit } = parseQuery(req, listSchema);
    const data = await db.query.alumniProfiles.findMany({
      where: eq(alumniProfiles.orgId, session.orgId),
      with: { user: { columns: { name: true, email: true, image: true } } },
      orderBy: [desc(alumniProfiles.createdAt)],
      limit,
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("read", "hr:alumni", async (session) => {
    const body = await parseBody(req, createSchema);

    const member = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.userId, body.userId), eq(organizationMembers.orgId, session.orgId)),
      columns: { userId: true },
      with: { user: { columns: { isActive: true } } },
    });

    if (!member) return err("Employee not found in this organization", 404);
    if (member.user?.isActive) return err("Cannot add an active employee as alumni. Employee must be separated first.", 400);

    const existing = await db.query.alumniProfiles.findFirst({
      where: and(eq(alumniProfiles.userId, body.userId), eq(alumniProfiles.orgId, session.orgId)),
      columns: { id: true },
    });
    if (existing) return err("This employee is already in the alumni network.", 409);

    const [record] = await db
      .insert(alumniProfiles)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        currentCompany: body.currentCompany ?? null,
        currentRole: body.currentRole ?? null,
        linkedinUrl: body.linkedinUrl || null,
        email: body.email || null,
        leftDate: body.leftDate ?? null,
        isOptedIn: body.isOptedIn ?? true,
      })
      .returning();

    return ok(record, 201);
  });
}
