import { type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { invalidateUserSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";

const setupSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  companySize: z.string().min(1, "Company size is required"),
  country: z.string().min(1, "Country is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  phone: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    if (!session.user.isOrgOwner) {
      return err("Forbidden", 403);
    }

    const input = await parseBody(req, setupSchema);

    await db.transaction(async (tx) => {
      await tx
        .update(organizations)
        .set({
          name: input.companyName,
          industry: input.industry,
          companySize: input.companySize,
          country: input.country,
          onboardingCompletedAt: new Date(),
        })
        .where(eq(organizations.id, session.orgId));

      await tx
        .update(users)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          name: `${input.firstName} ${input.lastName}`,
          designation: input.jobTitle,
          ...(input.phone ? { phone: input.phone } : {}),
        })
        .where(eq(users.id, session.user.id));
    });

    await invalidateUserSession(session.user.id);

    await createAuditLog({
      action: "org.setup.completed",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: session.orgId,
      targetType: "organization",
      metadata: { industry: input.industry, companySize: input.companySize, country: input.country },
    });

    return ok({ success: true });
  });
}
