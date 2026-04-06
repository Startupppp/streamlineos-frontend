import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { resignations } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(2000),
  lastWorkingDate: z.string().min(1, "Last working date is required"),
  noticePeriodDays: z.number().int().min(0).max(180).optional().default(30),
});

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const conditions = [eq(resignations.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(resignations.userId, session.user.id));

    const data = await db.query.resignations.findMany({
      where: and(...conditions),
      with: { user: true, checklists: true },
      orderBy: [desc(resignations.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = createSchema.parse(await req.json());
    const [resignation] = await db.insert(resignations).values({
      orgId: session.orgId,
      userId: session.user.id,
      reason: body.reason,
      lastWorkingDate: body.lastWorkingDate,
      noticePeriodDays: body.noticePeriodDays,
      status: "SUBMITTED",
    }).returning();
    return ok(resignation, 201);
  });
}
