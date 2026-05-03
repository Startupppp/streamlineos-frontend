import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { performanceImprovementPlans, pipGoals, users } from "@/lib/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { isManagerOf } from "@/lib/rbac/manager";
import { createPIPSchema } from "@/lib/validations/hr-pip";
import type { NextRequest } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role) || session.user.role === "ADMIN";
    const base = eq(performanceImprovementPlans.orgId, session.orgId);

    if (isAdmin) {
      const data = await db.query.performanceImprovementPlans.findMany({
        where: base,
        with: {
          user: { columns: { id: true, name: true, image: true, email: true } },
          manager: { columns: { id: true, name: true, image: true } },
          hrRep: { columns: { id: true, name: true } },
          goals: true,
        },
        orderBy: [desc(performanceImprovementPlans.createdAt)],
        limit: 100,
      });
      return ok(data);
    }

    const reporteeRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.reportingTo, session.user.id));
    const reporteeIds = reporteeRows.map((r) => r.id);

    const parts = [
      eq(performanceImprovementPlans.userId, session.user.id),
      eq(performanceImprovementPlans.managerId, session.user.id),
      eq(performanceImprovementPlans.hrRepId, session.user.id),
      eq(performanceImprovementPlans.mentorId, session.user.id),
    ];
    if (reporteeIds.length > 0) {
      parts.push(inArray(performanceImprovementPlans.userId, reporteeIds));
    }

    const data = await db.query.performanceImprovementPlans.findMany({
      where: and(base, or(...parts)),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        manager: { columns: { id: true, name: true, image: true } },
        hrRep: { columns: { id: true, name: true } },
        goals: true,
      },
      orderBy: [desc(performanceImprovementPlans.createdAt)],
      limit: 100,
    });

    const out = [];
    const seen = new Set<number>();
    for (const row of data) {
      if (seen.has(row.id)) continue;
      const allowed =
        row.userId === session.user.id ||
        row.managerId === session.user.id ||
        row.hrRepId === session.user.id ||
        row.mentorId === session.user.id ||
        reporteeIds.includes(row.userId) ||
        (await isManagerOf(session.user.id, row.userId));
      if (allowed) {
        seen.add(row.id);
        out.push(row);
      }
    }
    return ok(out);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createPIPSchema);
    const isAdmin = isAdminOrOwner(session.user.role) || session.user.role === "ADMIN";
    if (!isAdmin) {
      const mgr = await isManagerOf(session.user.id, body.userId);
      if (!mgr) return err("Only HR, CEO, or the employee's manager can create a PIP.", 403);
    }

    const id = await db.transaction(async (tx) => {
      const [pip] = await tx
        .insert(performanceImprovementPlans)
        .values({
          orgId: session.orgId,
          userId: body.userId,
          managerId: session.user.id,
          reason: body.reason ?? body.description.slice(0, 1000),
          objectives: body.goals.map((g) => ({
            objective: g.title,
            metric: g.successCriteria,
            deadline: g.deadline,
          })),
          startDate: body.startDate,
          endDate: body.endDate,
          status: "DRAFT",
          reasonCategory: body.reasonCategory,
          description: body.description,
          areasOfConcern: body.areasOfConcern,
          evidence: body.evidence,
          reviewFrequency: body.reviewFrequency,
          reviewMethod: body.reviewMethod,
          mentorId: body.mentorId ?? null,
          hrRepId: body.hrRepId,
          expectedImprovement: body.expectedImprovement,
          consequencesIfNotMet: body.consequencesIfNotMet,
          linkedAppraisalId: body.linkedAppraisalId ?? null,
          initiatedBy: session.user.id,
        })
        .returning({ id: performanceImprovementPlans.id });

      const pipId = pip!.id;
      for (let i = 0; i < body.goals.length; i++) {
        const g = body.goals[i]!;
        await tx.insert(pipGoals).values({
          pipId,
          title: g.title,
          description: g.description ?? null,
          successCriteria: g.successCriteria,
          deadline: g.deadline,
          sortOrder: i,
        });
      }
      return pipId;
    });

    const row = await db.query.performanceImprovementPlans.findFirst({
      where: eq(performanceImprovementPlans.id, id),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        manager: { columns: { id: true, name: true } },
        hrRep: { columns: { id: true, name: true } },
        goals: true,
      },
    });
    return ok(row, 201);
  });
}
