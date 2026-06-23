import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { encrypt, encryptBankDetails, type BankDetails } from "@/lib/encryption";
import { db } from "@/lib/db";
import { users, organizationMembers, salaryStructures, passwordResetTokens } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { invalidateHrDashboardCache } from "@/lib/hr-cache";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { sendWelcomeEmail } from "@/lib/email";
import { appUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";

const MIN_AGE_MS = 16 * 365.25 * 24 * 60 * 60 * 1000;

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
  dateOfBirth: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const dob = new Date(val);
      return !isNaN(dob.getTime()) && dob < new Date();
    }, "Date of birth cannot be in the future")
    .refine((val) => {
      if (!val) return true;
      const dob = new Date(val);
      return !isNaN(dob.getTime()) && Date.now() - dob.getTime() >= MIN_AGE_MS;
    }, "Employee must be at least 16 years old"),
  skills: z.string().optional(),
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
    pfUanNumber: z.string().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  return withAbility("manage", "hr:employees", async (session) => {
    const body = await parseBody(req, onboardSchema);

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, body.email.toLowerCase()),
    });
    if (existing) {
      return err("A user with this email already exists.", 409);
    }

    const passwordHash = await hash(body.password || nanoid(32), 12);
    const userId = randomUUID();

    const resolvedEmployeeId = body.employeeId?.trim() || `EMP-${nanoid(6).toUpperCase()}`;

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
        employeeId: resolvedEmployeeId,
        joiningDate: body.joiningDate ? formatDateOnly(new Date(body.joiningDate)) : undefined,
        dateOfBirth: body.dateOfBirth ? formatDateOnly(new Date(body.dateOfBirth)) : undefined,
        skills: body.skills ? (() => {
          const seen = new Set<string>();
          return body.skills.split(",")
            .map((s) => s.trim())
            .filter((s) => s && /[a-zA-Z0-9]/.test(s))
            .reduce<string[]>((acc, s) => {
              const key = s.toLowerCase();
              if (seen.has(key)) return acc;
              seen.add(key);
              acc.push(s.charAt(0).toUpperCase() + s.slice(1));
              return acc;
            }, []);
        })() : undefined,
        experienceYears: body.experienceYears?.toString(),
        taxId: body.taxId ? encrypt(body.taxId) : undefined,
        monthlySalary: body.monthlySalary?.toString(),
        bankDetails: body.bankDetails?.accountNumber
          ? encryptBankDetails(body.bankDetails as BankDetails)
          : undefined,
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
        effectiveFrom: body.joiningDate
          ? formatDateOnly(new Date(body.joiningDate))
          : formatDateOnly(new Date()),
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

    void import("@/lib/services/automation/engine").then(({ runAutomationsForEvent }) =>
      runAutomationsForEvent(session.orgId, "onboarding.started", {
        userId: newUser.id,
        employeeName: `${body.firstName} ${body.lastName}`,
        employeeEmail: body.email,
        departmentId: body.departmentId ?? null,
        joiningDate: body.joiningDate ?? null,
        startedAt: new Date().toISOString(),
      })
    );

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
        logger.error("Failed to send setup email", { email: newUser.email, error: emailErr });
      }
    }

    return ok({ success: true }, 201);
  });
}
