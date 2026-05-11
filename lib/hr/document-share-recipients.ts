"server-only";

import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ROLES } from "@/lib/constants/roles";

export async function getDocumentShareRecipientEmails(
  orgId: string,
  target: "HR" | "CEO" | "BOTH",
): Promise<{ emails: string[]; warnings: string[] }> {
  const roles =
    target === "BOTH"
      ? [ROLES.CEO, ROLES.HR]
      : target === "CEO"
        ? [ROLES.CEO]
        : [ROLES.HR];

  const rows = await db
    .select({ email: users.email, role: users.role })
    .from(users)
    .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(users.isActive, true),
        inArray(users.role, roles),
      ),
    );

  const emails = [...new Set(rows.map((r) => r.email).filter(Boolean))] as string[];
  const warnings: string[] = [];
  if ((target === "CEO" || target === "BOTH") && !rows.some((r) => r.role === ROLES.CEO)) {
    warnings.push("No active CEO found in this organization.");
  }
  if ((target === "HR" || target === "BOTH") && !rows.some((r) => r.role === ROLES.HR)) {
    warnings.push("No active HR user found in this organization.");
  }
  return { emails, warnings };
}
