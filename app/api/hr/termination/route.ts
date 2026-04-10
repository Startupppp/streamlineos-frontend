import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { terminations, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  reasons: z.array(z.string()).min(1, "At least one reason is required"),
  detailedExplanation: z.string().min(100, "Explanation must be at least 100 characters"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  severanceAmount: z.string().optional(),
  noticePeriodWaived: z.boolean().optional().default(false),
  internalNotes: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const data = await db.query.terminations.findMany({
      where: eq(terminations.orgId, session.orgId),
      with: { user: true, initiator: true, ceoReviewer: true },
      orderBy: [desc(terminations.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (session.user.role !== "HR" && session.user.role !== "CEO") {
      return err("Only HR can initiate terminations.", 403);
    }

    const body = createSchema.parse(await req.json());

    // Verify the employee exists in the org
    const employee = await db.query.users.findFirst({
      where: eq(users.id, body.userId),
    });
    if (!employee) return err("Employee not found.", 404);

    const [termination] = await db.insert(terminations).values({
      orgId: session.orgId,
      userId: body.userId,
      reasons: body.reasons,
      detailedExplanation: body.detailedExplanation,
      effectiveDate: body.effectiveDate,
      severanceAmount: body.severanceAmount || null,
      noticePeriodWaived: body.noticePeriodWaived,
      internalNotes: body.internalNotes || null,
      status: "DRAFT",
      initiatedBy: session.user.id,
    }).returning();

    return ok(termination, 201);
  });
}
