"use server";

import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getLeaveData() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  const balances = await db.query.leaveBalances.findMany({
    where: and(eq(leaveBalances.userId, userId), eq(leaveBalances.orgId, orgId)),
  });

  const allTypes = await db.query.leaveTypes.findMany({
      where: eq(leaveTypes.orgId, orgId)
  });

  const requests = await db.query.leaveRequests.findMany({
    where: and(eq(leaveRequests.userId, userId), eq(leaveRequests.orgId, orgId)),
    orderBy: [desc(leaveRequests.createdAt)],
  });

  return { balances, allTypes, requests };
}

export async function requestLeave(data: { typeId: number; startDate: string; endDate: string; reason: string }) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  await db.insert(leaveRequests).values({
    orgId,
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
  const { userId, orgId } = await auth(); // This is the Approver
  if (!userId || !orgId) throw new Error("Unauthorized");

  // Verify Role (should be Admin or Manager) - omitted for MVP
  
  await db.update(leaveRequests)
    .set({ status, approverId: userId })
    .where(and(eq(leaveRequests.id, requestId), eq(leaveRequests.orgId, orgId)));

  revalidatePath("/hr/leaves");
}
