"use server";

import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes, users } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getLeaveData() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const balances = await db.query.leaveBalances.findMany({
    where: eq(leaveBalances.userId, userId),
    with: {
        // We can't easily join in drizzle query builder type inference without defining relations in schema.ts properly for 'leaveType'
        // Assuming we fix relations or just fetch types separately.
        // For speed, let's fetch types separately or rely on ID matching in UI.
    }
  });

  const allTypes = await db.select().from(leaveTypes);

  const requests = await db.query.leaveRequests.findMany({
    where: eq(leaveRequests.userId, userId),
    orderBy: [desc(leaveRequests.createdAt)],
  });

  return { balances, allTypes, requests };
}

export async function requestLeave(data: { typeId: number; startDate: string; endDate: string; reason: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Validate balance
  // ... (skipped for MVP, but should check if balance >= requested days)

  await db.insert(leaveRequests).values({
    userId,
    leaveTypeId: data.typeId,
    startDate: data.startDate,
    endDate: data.endDate,
    reason: data.reason,
    status: "PENDING",
  });

  revalidatePath("/hr/leaves");
}

export async function approveLeave(requestId: number, status: "APPROVED" | "REJECTED") {
  const { userId } = await auth(); // This is the Approver
  if (!userId) throw new Error("Unauthorized");

  // Verify Role (should be Admin or Manager) - omitted for MVP "everyone is admin" logic or simple check
  // const user = ... check role.

  await db.update(leaveRequests)
    .set({ status, approverId: userId })
    .where(eq(leaveRequests.id, requestId));

  if (status === "APPROVED") {
      // Deduct balance logic here
  }

  revalidatePath("/hr/leaves");
}
