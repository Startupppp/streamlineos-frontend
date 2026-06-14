import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getEmployee } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { users, organizationMembers, onboardingTasks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { invalidateUserSession } from "@/lib/auth";
import { sendTerminationEmail } from "@/lib/email";
import { format, differenceInDays, addDays } from "date-fns";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import { createAuditLog } from "@/lib/audit-log";

const updateEmployeeSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  designation: z.string().optional(),
  departmentId: z.number().optional(),
  phone: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
  hasDashboardAccess: z.boolean().optional(),
  role: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  experienceYears: z.preprocess(
    (val) => (val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0, "Experience cannot be negative").max(60, "Experience cannot exceed 60 years").optional()
  ),
  taxId: z.string().optional(),
  monthlySalary: z.number().optional(),
  bankDetails: z.object({
    accountNumber: z.string().optional(),
    bankName: z.string().optional(),
    branch: z.string().optional(),
    ifsc: z.string().optional(),
    accountHolder: z.string().optional(),
  }).optional(),
  skills: z.array(z.string()).optional(),
  bio: z.string().max(500).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  joiningDate: z.string().optional(),
  reportingTo: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  return withAuth(async (session) => {
    const { employeeId: id } = await params;
    const employee = await getEmployee(session.orgId, id);
    if (!employee) return err("Employee not found.", 404);
    return ok(employee);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  return withAuth(async (session) => {
    const { employeeId: targetUserId } = await params;

    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, targetUserId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });

    if (!targetMember) {
      return err("User not found in your organization.", 403);
    }

    const isSelf = session.user.id === targetUserId;
    const ability = await getSessionAbility();

    const isOwnerOrAdmin = ability.can("manage", "hr:employees");
    if (!isSelf && !isOwnerOrAdmin) {
      return err("You can only update your own profile.", 403);
    }

    const body = await parseBody(req, updateEmployeeSchema);

    if (body.isActive === false) {
      if (!isOwnerOrAdmin) return err("Only admins can terminate employees.", 403);
      if (isSelf) return err("You cannot terminate your own account.", 400);
    }

    if (body.reportingTo !== undefined && body.reportingTo !== null) {
      if (body.reportingTo === targetUserId) {
        return err("An employee cannot report to themselves.", 400);
      }
      let cursor: string | null = body.reportingTo;
      const visited = new Set<string>([targetUserId]);
      while (cursor) {
        if (visited.has(cursor)) {
          return err("This reporting structure would create a circular management chain.", 400);
        }
        visited.add(cursor);
        const mgr: { reportingTo: string | null } | undefined = await db.query.users.findFirst({
          where: eq(users.id, cursor),
          columns: { reportingTo: true },
        });
        cursor = mgr?.reportingTo ?? null;
      }
    }

    const targetUser = body.isActive === false
      ? await db.query.users.findFirst({ where: eq(users.id, targetUserId) })
      : null;

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.firstName !== undefined || body.lastName !== undefined) {
      const existing = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: { firstName: true, lastName: true, name: true },
      });
      const first = body.firstName ?? existing?.firstName ?? "";
      const last = body.lastName ?? existing?.lastName ?? "";
      updateData.firstName = first;
      updateData.lastName = last;
      if (!body.name) updateData.name = `${first} ${last}`.trim();
    }
    if (body.role !== undefined && isOwnerOrAdmin) updateData.role = body.role;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.experienceYears !== undefined) updateData.experienceYears = body.experienceYears;
    if (body.taxId !== undefined) updateData.taxId = body.taxId;
    if (body.monthlySalary !== undefined && isOwnerOrAdmin) updateData.monthlySalary = body.monthlySalary;
    if (body.bankDetails !== undefined) updateData.bankDetails = body.bankDetails;
    if (body.designation !== undefined) updateData.designation = body.designation;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.hasDashboardAccess !== undefined) {
      if (!isOwnerOrAdmin) return err("Only admins can toggle dashboard access.", 403);
      updateData.hasDashboardAccess = body.hasDashboardAccess;
    }
    if (body.skills !== undefined) updateData.skills = body.skills;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.linkedinUrl !== undefined) updateData.linkedinUrl = body.linkedinUrl || null;
    if (body.twitterUrl !== undefined) updateData.twitterUrl = body.twitterUrl || null;
    if (body.githubUrl !== undefined) updateData.githubUrl = body.githubUrl || null;
    if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl || null;
    if (body.joiningDate !== undefined) updateData.joiningDate = body.joiningDate;
    if (body.reportingTo !== undefined) updateData.reportingTo = body.reportingTo;

    if (Object.keys(updateData).length > 0) {
      await db.update(users).set(updateData).where(eq(users.id, targetUserId));
    }

    if (body.joiningDate && isOwnerOrAdmin) {
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: { joiningDate: true },
      });
      const oldDate = currentUser?.joiningDate ? new Date(currentUser.joiningDate) : null;
      const newDate = new Date(body.joiningDate);
      if (oldDate && oldDate.getTime() !== newDate.getTime()) {
        const dayDiff = differenceInDays(newDate, oldDate);
        const tasks = await db.query.onboardingTasks.findMany({
          where: and(
            eq(onboardingTasks.userId, targetUserId),
            eq(onboardingTasks.status, "PENDING")
          ),
          columns: { id: true, dueDate: true },
        });
        for (const task of tasks) {
          if (task.dueDate) {
            await db
              .update(onboardingTasks)
              .set({ dueDate: addDays(task.dueDate, dayDiff) })
              .where(eq(onboardingTasks.id, task.id));
          }
        }
      }
    }

    if (body.isActive === false) {
      await invalidateUserSession(targetUserId);
      if (targetUser?.email) {
        sendTerminationEmail(
          targetUser.email,
          targetUser.name ?? "Employee",
          targetUser.designation ?? "N/A",
          format(new Date(), "dd MMM yyyy"),
          session.user.name ?? "HR",
          "Termination as per company policy."
        ).catch(() => undefined);
      }
    }

    if (body.isActive === true) {
      const activatedUser = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: { joiningDate: true },
      });
      await inngest.send({
        name: "hr/employee.onboarded",
        data: {
          userId: targetUserId,
          orgId: session.orgId,
          joiningDate: activatedUser?.joiningDate ?? new Date().toISOString().split("T")[0],
        },
      });
    }

    void createAuditLog({
      action: body.isActive === false ? "hr.employee_terminated" : "hr.employee_updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: targetUserId,
      targetType: "employee",
      metadata: { changedFields: Object.keys(updateData), isTermination: body.isActive === false },
    }).catch(() => {});

    return ok({ success: true });
  });
}
