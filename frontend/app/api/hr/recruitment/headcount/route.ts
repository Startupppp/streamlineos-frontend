import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { headcountRequests, departments, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  status: z.string().optional(),
});

const createSchema = z.object({
  departmentId: z.number().int().positive().optional(),
  requestedRole: z.string().min(1).max(200),
  level: z.string().max(100).optional(),
  justification: z.string().max(5000).optional(),
  targetDate: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED"]).default("DRAFT"),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status } = parseQuery(req, listSchema);
    const role = session.user.role ?? "";
    const isHr = ["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role);

    const conditions = [eq(headcountRequests.orgId, session.orgId)];
    if (!isHr) conditions.push(eq(headcountRequests.requestedBy, session.user.id));
    if (status) conditions.push(eq(headcountRequests.status, status as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "JOB_CREATED"));

    const rows = await db
      .select({
        id: headcountRequests.id,
        orgId: headcountRequests.orgId,
        departmentId: headcountRequests.departmentId,
        requestedBy: headcountRequests.requestedBy,
        requestedRole: headcountRequests.requestedRole,
        level: headcountRequests.level,
        justification: headcountRequests.justification,
        targetDate: headcountRequests.targetDate,
        status: headcountRequests.status,
        approvedBy: headcountRequests.approvedBy,
        approvedAt: headcountRequests.approvedAt,
        rejectedReason: headcountRequests.rejectedReason,
        linkedJobPostingId: headcountRequests.linkedJobPostingId,
        createdAt: headcountRequests.createdAt,
        updatedAt: headcountRequests.updatedAt,
        departmentName: departments.name,
        requesterName: users.name,
        requesterEmail: users.email,
      })
      .from(headcountRequests)
      .leftJoin(departments, eq(headcountRequests.departmentId, departments.id))
      .leftJoin(users, eq(headcountRequests.requestedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(headcountRequests.createdAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);
    const [row] = await db
      .insert(headcountRequests)
      .values({
        orgId: session.orgId,
        requestedBy: session.user.id,
        departmentId: body.departmentId,
        requestedRole: body.requestedRole,
        level: body.level,
        justification: body.justification,
        targetDate: body.targetDate,
        status: body.status,
      })
      .returning();
    return ok(row, 201);
  });
}
