import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, organizations, organizationMembers, roles } from "@/lib/db/schema";
import { subscriptions } from "@/lib/db/schema/shared";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { z } from "zod";
import { ok, err, parseBody } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { addDays } from "date-fns";
import { DEFAULT_ORG_ROLES } from "@/lib/rbac/default-org-roles";

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
    const input = await parseBody(req, signupSchema);

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, input.email.toLowerCase()),
    });
    if (existing) {
      return err("An account with this email already exists.", 409);
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
        isOwner: true,
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

    return ok({ userId, orgId }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const detail = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return err(`Validation failed: ${detail}`, 400);
    }
    throw error;
  }
}
