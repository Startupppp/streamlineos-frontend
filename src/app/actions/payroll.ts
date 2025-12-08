"use server";

import { db } from "@/lib/db";
import { payrolls, users } from "@/lib/db/schema";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function generatePayroll(month: string) { // YYYY-MM
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  // In V2, we generate payroll for all members in the organization.
  // We fetch members from Clerk to ensure we have the correct list for this Org.
  
  const client = await clerkClient();
  const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: orgId });
  
  for (const mem of memberships.data) {
      const uId = mem.publicUserData?.userId;
      if (!uId) continue;

      // Mocking salary structure
      const basic = 50000;
      const hra = basic * 0.4;
      const allowances = 5000;
      const deductions = 2000; // PT + PF
      const gross = basic + hra + allowances;
      const net = gross - deductions;

      // Check if payroll already exists
      const existing = await db.query.payrolls.findFirst({
        where: and(eq(payrolls.userId, uId), eq(payrolls.month, month), eq(payrolls.orgId, orgId))
      });

      if (!existing) {
        await db.insert(payrolls).values({
            orgId,
            userId: uId,
            month,
            basicSalary: basic.toString(),
            hra: hra.toString(),
            allowances: allowances.toString(),
            deductions: deductions.toString(),
            grossSalary: gross.toString(),
            netSalary: net.toString(),
            status: "DRAFT",
            generatedBy: userId,
        });
      }
  }

  revalidatePath("/hr/payroll");
}

export async function getPayrolls() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    return await db.query.payrolls.findMany({
        where: and(eq(payrolls.userId, userId), eq(payrolls.orgId, orgId)),
        orderBy: (payrolls, { desc }) => [desc(payrolls.createdAt)]
    });
}
