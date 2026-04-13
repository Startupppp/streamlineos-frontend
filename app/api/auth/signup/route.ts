import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, organizations, organizationMembers } from "@/lib/db/schema";
import { subscriptions } from "@/lib/db/schema/shared";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { addDays } from "date-fns";

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

    // Check if email already exists
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
      // Create organization
      await tx.insert(organizations).values({
        id: orgId,
        name: input.companyName,
        slug: input.companyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 50) + "-" + Date.now().toString(36),
      });

      // Create user
      await tx.insert(users).values({
        id: userId,
        email: input.email.toLowerCase(),
        name: `${input.firstName} ${input.lastName}`,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        password: passwordHash,
        role: "CEO",
        isActive: true,
        hasDashboardAccess: true,
        emailVerified: new Date(),
        isPasswordChangeRequired: false,
      });

      // Link user to org
      await tx.insert(organizationMembers).values({
        orgId,
        userId,
        role: "owner",
      });

      // Create trial subscription (14 days)
      await tx.insert(subscriptions).values({
        orgId,
        plan: input.plan ?? "STARTER",
        status: "TRIAL",
        trialEndsAt: addDays(new Date(), 14),
        currentPeriodStart: new Date(),
        currentPeriodEnd: addDays(new Date(), 14),
      });
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
