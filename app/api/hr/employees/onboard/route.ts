import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers, salaryStructures, passwordResetTokens } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { invalidateHrDashboardCache } from "@/lib/hr-cache";
import { inngest } from "@/lib/inngest/client";
import { createAuditLog } from "@/lib/audit-log";
import { sendWelcomeEmail } from "@/lib/email";
import { appUrl } from "@/lib/app-url";
import { generateNextEmployeeId, normalizeEmployeeIdInput } from "@/lib/hr/generate-employee-id";
import { onboardEmployeeInputSchema } from "@/lib/validations/hr";

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, onboardEmployeeInputSchema);

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, body.email.toLowerCase()),
    });
    if (existing) {
      return err("A user with this email already exists.", 409);
    }

    const passwordHash = await hash(body.password || "Welcome@123", 12);
    const userId = randomUUID();

    let employeeId = normalizeEmployeeIdInput(body.employeeId);
    if (!employeeId) {
      employeeId = await generateNextEmployeeId(body.joiningDate ?? new Date());
    } else {
      const existingId = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.employeeId, employeeId!),
        columns: { id: true },
      });
      if (existingId) {
        return err("This employee ID is already in use.", 409);
      }
    }

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
        employeeId,
        joiningDate: formatDateOnly(body.joiningDate),
        dateOfBirth: formatDateOnly(body.dateOfBirth),
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
      role: body.role || "ENGINEERING",
    });

    if (body.monthlySalary && body.monthlySalary > 0) {
      const basicSalary = body.monthlySalary * 0.5;
      const specialAllowance = body.monthlySalary * 0.25;
      await db.insert(salaryStructures).values({
        orgId: session.orgId,
        userId: newUser.id,
        basicSalary: basicSalary.toString(),
        hraPercentage: "50",
        allowances: specialAllowance.toString(),
        deductions: "0",
        effectiveFrom: formatDateOnly(body.joiningDate),
        isActive: true,
      });
    }

    await invalidateHrDashboardCache(session.orgId);

    void inngest.send({
      name: "hr/employee.onboarded",
      data: {
        userId: newUser.id,
        orgId: session.orgId,
        joiningDate: body.joiningDate ?? null,
      },
    }).catch(() => {
    });

    void import("@/lib/inngest/dispatch-webhook").then(({ dispatchWebhook }) =>
      dispatchWebhook(session.orgId, "employee.hired", {
        userId: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        joiningDate: body.joiningDate ?? null,
      })
    );

    try {
      await createAuditLog({
        action: "hr.employee_onboarded",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: newUser.id,
        targetType: "employee",
        metadata: { email: body.email, name: `${body.firstName} ${body.lastName}`, role: body.role, designation: body.designation },
      });
    } catch {  }

    if (newUser.email) {
      try {
        const setupToken = nanoid(48);
        await db.insert(passwordResetTokens).values({
          id: randomUUID(),
          email: newUser.email,
          token: setupToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const setupUrl = `${appUrl}/setup-password?token=${setupToken}`;
        await sendWelcomeEmail(newUser.email, `${body.firstName} ${body.lastName}`, setupUrl);
      } catch (emailErr) {
        console.error("Failed to send setup email", { email: newUser.email, error: emailErr });
      }
    }

    return ok({ success: true });
  });
}
