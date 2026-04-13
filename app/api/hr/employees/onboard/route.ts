import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers, salaryStructures } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { invalidateHrDashboardCache } from "@/lib/hr-cache";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const onboardSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  whatsappSameAsPhone: z.boolean().optional(),
  whatsappNumber: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  password: z.string().optional(),
  designation: z.string(),
  departmentId: z.number().optional(),
  role: z.string().optional(),
  employeeId: z.string().optional(),
  joiningDate: z.string().optional(),
  dateOfBirth: z.string().optional(),
  skills: z.string().optional(),
  experienceYears: z.number().optional(),
  taxId: z.string().optional(),
  monthlySalary: z.number().optional(),
  bankDetails: z.object({
    accountNumber: z.string().optional(),
    bankName: z.string().optional(),
    branch: z.string().optional(),
    ifsc: z.string().optional(),
    accountHolder: z.string().optional(),
    pfUanNumber: z.string().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, onboardSchema);

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, body.email.toLowerCase()),
    });
    if (existing) {
      return err("A user with this email already exists.", 409);
    }

    const passwordHash = await hash(body.password || "Welcome@123", 12);
    const userId = randomUUID();

    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        email: body.email.toLowerCase(),
        name: `${body.firstName} ${body.lastName}`,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        whatsappNumber: body.whatsappSameAsPhone ? body.phone : body.whatsappNumber,
        gender: body.gender,
        password: passwordHash,
        designation: body.designation,
        departmentId: body.departmentId,
        role: body.role || "ENGINEERING",
        employeeId: body.employeeId,
        joiningDate: body.joiningDate ? formatDateOnly(new Date(body.joiningDate)) : undefined,
        dateOfBirth: body.dateOfBirth ? formatDateOnly(new Date(body.dateOfBirth)) : undefined,
        skills: body.skills ? body.skills.split(",").map((s) => s.trim()) : undefined,
        experienceYears: body.experienceYears?.toString(),
        taxId: body.taxId,
        monthlySalary: body.monthlySalary?.toString(),
        bankDetails: body.bankDetails as typeof users.$inferInsert["bankDetails"],
        isActive: true,
        hasDashboardAccess: true,
        isPasswordChangeRequired: true,
      })
      .returning();

    await db.insert(organizationMembers).values({
      orgId: session.orgId,
      userId: newUser.id,
      role: "member",
    });

    if (body.monthlySalary && body.monthlySalary > 0) {
      const basicSalary = body.monthlySalary * 0.5;
      await db.insert(salaryStructures).values({
        orgId: session.orgId,
        userId: newUser.id,
        basicSalary: basicSalary.toString(),
        hraPercentage: "40",
        allowances: (body.monthlySalary * 0.2).toString(),
        deductions: "0",
        effectiveFrom: body.joiningDate
          ? formatDateOnly(new Date(body.joiningDate))
          : formatDateOnly(new Date()),
        isActive: true,
      });
    }

    // Invalidate HR dashboard caches so headcount reflects immediately
    await invalidateHrDashboardCache(session.orgId);

    // Trigger auto-onboarding workflow (non-blocking)
    void inngest.send({
      name: "hr/employee.onboarded",
      data: {
        userId: newUser.id,
        orgId: session.orgId,
        joiningDate: body.joiningDate ?? null,
      },
    }).catch(() => {
      // Non-critical — onboarding can be initiated manually if this fails
    });

    // Fire webhook event (non-blocking)
    void import("@/lib/inngest/dispatch-webhook").then(({ dispatchWebhook }) =>
      dispatchWebhook(session.orgId, "employee.hired", {
        userId: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        joiningDate: body.joiningDate ?? null,
      })
    );

    void createAuditLog({
      action: "hr.employee_onboarded",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: newUser.id,
      targetType: "employee",
      metadata: { email: body.email, name: `${body.firstName} ${body.lastName}`, role: body.role, designation: body.designation },
    }).catch(() => {});

    return ok({ success: true });
  });
}
