import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTypes, onboardingDocuments } from "@/lib/db/schema/hr";
import { users, organizationMembers } from "@/lib/db/schema/auth";
import { eq, and, desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAdmin(async (session) => {
    const mandatoryTypes = await db
      .select({ id: documentTypes.id, name: documentTypes.name })
      .from(documentTypes)
      .where(
        and(
          eq(documentTypes.orgId, session.orgId),
          eq(documentTypes.isActive, true),
          eq(documentTypes.isMandatory, true)
        )
      );

    const totalRequired = mandatoryTypes.length;

    const employees = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        designation: users.designation,
        employeeId: users.employeeId,
        onboardingDocStatus: users.onboardingDocStatus,
      })
      .from(users)
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.userId, users.id),
          eq(organizationMembers.orgId, session.orgId)
        )
      )
      .where(eq(users.isActive, true));

    if (employees.length === 0) return ok([]);

    const employeeIds = employees.map((e) => e.id);

    const allDocs = await db
      .select({
        userId: onboardingDocuments.userId,
        documentTypeId: onboardingDocuments.documentTypeId,
        status: onboardingDocuments.status,
        id: onboardingDocuments.id,
      })
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.orgId, session.orgId))
      .orderBy(desc(onboardingDocuments.id));

    type DocStatusMap = Map<number, string>;
    const userDocMap = new Map<string, DocStatusMap>();

    for (const doc of allDocs) {
      if (!employeeIds.includes(doc.userId)) continue;

      if (!userDocMap.has(doc.userId)) {
        userDocMap.set(doc.userId, new Map());
      }
      const typeMap = userDocMap.get(doc.userId)!;
      if (!typeMap.has(doc.documentTypeId)) {
        typeMap.set(doc.documentTypeId, doc.status ?? "PENDING");
      }
    }

    const summary = employees.map((emp) => {
      const typeMap = userDocMap.get(emp.id) ?? new Map<number, string>();

      let totalSubmitted = 0;
      let totalApproved = 0;
      let totalRejected = 0;

      for (const [, status] of typeMap) {
        if (
          status === "SUBMITTED" ||
          status === "RE_UPLOAD_REQUESTED" ||
          status === "APPROVED" ||
          status === "REJECTED"
        ) {
          totalSubmitted++;
        }
        if (status === "APPROVED") totalApproved++;
        if (status === "REJECTED") totalRejected++;
      }

      return {
        userId: emp.id,
        userName: emp.name,
        userImage: emp.image,
        designation: emp.designation,
        employeeId: emp.employeeId,
        totalRequired,
        totalSubmitted,
        totalApproved,
        totalRejected,
        onboardingDocStatus: emp.onboardingDocStatus ?? "PENDING",
      };
    });

    return ok(summary);
  });
}
