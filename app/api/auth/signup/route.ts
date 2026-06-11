import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, organizations, organizationMembers, roles } from "@/lib/db/schema";
import { subscriptions } from "@/lib/db/schema/shared";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { addDays } from "date-fns";
import { PERMISSIONS } from "@/lib/rbac/permissions";

const DEFAULT_ORG_ROLES: Array<{ name: string; slug: string; permissions: string[] }> = [
  {
    name: "Administrator",
    slug: "ADMIN",
    permissions: PERMISSIONS.map((p) => p.name),
  },
  {
    name: "HR Manager",
    slug: "HR_MANAGER",
    permissions: [
      "self:attendance",
      "self:leaves",
      "self:expenses",
      "self:payslips",
      "hr:employees:view",
      "hr:employees:create",
      "hr:employees:update",
      "hr:employees:delete",
      "hr:attendance:view",
      "hr:attendance:manage",
      "hr:leaves:view",
      "hr:leaves:approve",
      "hr:payroll:view",
      "hr:payroll:generate",
      "hr:payroll:approve",
      "hr:salary:view",
      "hr:salary:manage",
      "hr:expenses:view",
      "hr:expenses:approve",
      "hr:documents:view",
      "hr:documents:manage",
      "hr:assets:view",
      "hr:assets:manage",
      "hr:performance:view",
      "hr:performance:manage",
      "hr:goals:view",
      "hr:goals:manage",
      "reports:view",
      "reports:create",
      "reports:export",
    ],
  },
  {
    name: "Project Manager",
    slug: "PROJECT_MANAGER",
    permissions: [
      "self:attendance",
      "self:leaves",
      "self:expenses",
      "self:payslips",
      "projects:view",
      "projects:create",
      "projects:update",
      "projects:tickets:view",
      "projects:tickets:create",
      "projects:tickets:update",
      "projects:tickets:delete",
      "projects:tickets:assign",
      "projects:sprints:view",
      "projects:sprints:manage",
      "projects:timesheets:view",
      "projects:timesheets:create",
      "reports:view",
    ],
  },
  {
    name: "Sales",
    slug: "SALES_REP",
    permissions: [
      "self:attendance",
      "self:leaves",
      "self:expenses",
      "self:payslips",
      "crm:leads:view",
      "crm:leads:create",
      "crm:leads:update",
      "crm:targets:view",
      "crm:clients:read",
      "crm:clients:update",
      "dashboard:sales:view",
    ],
  },
  {
    name: "Team Member",
    slug: "MEMBER",
    permissions: [
      "self:attendance",
      "self:leaves",
      "self:expenses",
      "self:payslips",
      "hr:leaves:create",
      "hr:expenses:create",
    ],
  },
];

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[0-9]/, "Must include a number")
    .regex(/[^A-Za-z0-9]/, "Must include a special character"),
  companyName: z.string().min(1, "Company name is required"),
  phone: z.string().optional(),
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = signupSchema.parse(body);

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, input.email.toLowerCase()),
    });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hash(input.password, 12);
    const userId = randomUUID();
    const orgId = randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(organizations).values({
        id: orgId,
        name: input.companyName,
        slug: input.companyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 50) + "-" + Date.now().toString(36),
      });

      await tx.insert(users).values({
        id: userId,
        email: input.email.toLowerCase(),
        name: `${input.firstName} ${input.lastName}`,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        password: passwordHash,
        role: "OWNER",
        isActive: true,
        hasDashboardAccess: true,
        emailVerified: new Date(),
        isPasswordChangeRequired: false,
      });

      await tx.insert(organizationMembers).values({
        orgId,
        userId,
        role: "owner",
      });

      await tx.insert(subscriptions).values({
        orgId,
        plan: input.plan ?? "STARTER",
        status: "TRIAL",
        trialEndsAt: addDays(new Date(), 14),
        currentPeriodStart: new Date(),
        currentPeriodEnd: addDays(new Date(), 14),
      });

      await tx.insert(roles).values(
        DEFAULT_ORG_ROLES.map((r) => ({
          name: r.name,
          slug: r.slug,
          orgId,
          isSystem: false,
          permissions: r.permissions,
        })),
      );
    });

    void createAuditLog({
      action: "user.signup",
      userId,
      orgId,
      metadata: { email: input.email, companyName: input.companyName, plan: input.plan ?? "STARTER" },
    }).catch(() => {});

    return NextResponse.json({ success: true, userId, orgId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const detail = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${detail}` }, { status: 400 });
    }
    throw error;
  }
}
