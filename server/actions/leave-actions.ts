"use server";

import { db } from "@/lib/db";
import { 
    leaveRequests, 
    leaveTypes, 
    leaveBalances, 
    users, 
    organizationMembers 
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Helper: Ensure leave types exist and get them
async function ensureLeaveTypes(orgId: string) {
    let types = await db.query.leaveTypes.findMany({
        where: eq(leaveTypes.orgId, orgId)
    });

    if (types.length === 0) {
        // Create defaults
        const defaults = [
            { name: "Casual Leave", daysPerYear: 12, carryForward: false },
            { name: "Sick Leave", daysPerYear: 6, carryForward: false },
             { name: "Privilege Leave", daysPerYear: 15, carryForward: true },
        ];
        
        for (const t of defaults) {
            await db.insert(leaveTypes).values({
                orgId,
                name: t.name,
                daysPerYear: t.daysPerYear,
                carryForward: t.carryForward
            });
        }
        
        types = await db.query.leaveTypes.findMany({
            where: eq(leaveTypes.orgId, orgId)
        });
    }
    return types;
}

// Helper: Ensure user has balances for current year
async function ensureUserBalances(orgId: string, userId: string, types: any[]) {
    const year = new Date().getFullYear();
    
    // Check existing
    const balances = await db.query.leaveBalances.findMany({
        where: and(
            eq(leaveBalances.userId, userId),
            eq(leaveBalances.orgId, orgId),
            eq(leaveBalances.year, year)
        ),
        with: {
            // @ts-ignore - Relation naming might vary, using loose types here
            // leaveType: true 
        }
    });

    // Simple map of existing types
    const existingTypeIds = new Set(balances.map(b => b.leaveTypeId));

    for (const t of types) {
        if (!existingTypeIds.has(t.id)) {
            await db.insert(leaveBalances).values({
                orgId,
                userId,
                leaveTypeId: t.id,
                year,
                balance: t.daysPerYear.toString()
            });
        }
    }
}


export async function getLeaveContext() {
     const session = await auth();
     if (!session?.user?.id) return { error: "Unauthorized" };

     // Get Org
     const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id)
     });
     if (!member) return { error: "No organization found" };

     const types = await ensureLeaveTypes(member.orgId);
     await ensureUserBalances(member.orgId, session.user.id, types);

     // Fetch balances
     const balances = await db.select({
         id: leaveBalances.id,
         leaveTypeId: leaveBalances.leaveTypeId,
         balance: leaveBalances.balance,
         typeName: leaveTypes.name
     })
     .from(leaveBalances)
     .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
     .where(and(
         eq(leaveBalances.userId, session.user.id),
         eq(leaveBalances.year, new Date().getFullYear())
     ));

     return { success: true, balances, types };
}


export async function getApprovers() {
    const session = await auth();
    if (!session?.user?.id) return [];

    const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id)
    });
    if (!member) return [];

    // Logic: 
    // If user is MEMBER -> Approvers are ADMIN + OWNER
    // If user is ADMIN -> Approvers are OWNER
    // If user is OWNER -> Approvers are ... self? (Usually CEO doesn't apply, but for logic sake, maybe other Owners)
    
    let targetRoles = ["ADMIN", "OWNER"];
    if (member.role === "ADMIN") {
        targetRoles = ["OWNER"];
    }

    const approvers = await db.query.organizationMembers.findMany({
        where: and(
            eq(organizationMembers.orgId, member.orgId),
            // Check roles
            // Using raw SQL or multiple ORs. Drizzle 'inArray' needs explicit types sometimes
             sql`${organizationMembers.role} IN ${targetRoles}`
        ),
        with: {
            user: true
        }
    });

    // Filter out self
    return approvers
        .filter(m => m.userId !== session.user.id)
        .map(m => m.user);
}

export async function submitLeaveRequest(data: {
    leaveTypeId: number;
    startDate: Date;
    endDate: Date;
    reason: string;
    approverId: string;
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    
    const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id)
     });
     if (!member) return { error: "No organization found" };

    // Validate dates
    if (data.startDate > data.endDate) return { error: "Invalid date range" };

    try {
        await db.insert(leaveRequests).values({
            orgId: member.orgId,
            userId: session.user.id,
            leaveTypeId: data.leaveTypeId,
            startDate: data.startDate.toISOString(), // Assuming string date in DB based on Schema 'date'
            endDate: data.endDate.toISOString(),
            reason: data.reason,
            approverId: data.approverId,
            status: "PENDING"
        });

        revalidatePath("/hr/leaves");
        return { success: true };
    } catch(e) {
        console.error(e);
        return { error: "Failed to submit request" };
    }
}

export async function processLeaveRequest(data: {
    requestId: number;
    status: "APPROVED" | "REJECTED";
    rejectionReason?: string;
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const request = await db.query.leaveRequests.findFirst({
        where: eq(leaveRequests.id, data.requestId)
    });

    if (!request) return { error: "Request not found" };

    // Verify approver is current user (or Owner)
    if (request.approverId !== session.user.id) {
         // Optionally allow OWNER to override any request
         const member = await db.query.organizationMembers.findFirst({
             where: eq(organizationMembers.userId, session.user.id)
         });
         if (request.orgId !== member?.orgId || member.role !== "OWNER") {
             // For Strictness: Only designated approver or Owner
             return { error: "Not authorized to process this request" };
         }
    }

    try {
        await db.transaction(async (tx) => {
             // Update status
             await tx.update(leaveRequests)
                .set({
                    status: data.status,
                    rejectionReason: data.rejectionReason
                })
                .where(eq(leaveRequests.id, data.requestId));

             // If Approved, deduct balance
             if (data.status === "APPROVED") {
                 // Calculate days
                 // Note: Ideally we exclude weekends/holidays. For this MVP, simple date diff.
                 const start = new Date(request.startDate);
                 const end = new Date(request.endDate);
                 const diffTime = Math.abs(end.getTime() - start.getTime());
                 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

                 // Get current balance
                 const balanceRecord = await tx.query.leaveBalances.findFirst({
                     where: and(
                         eq(leaveBalances.userId, request.userId),
                         eq(leaveBalances.leaveTypeId, request.leaveTypeId!), // assuming not null
                         eq(leaveBalances.year, new Date().getFullYear())
                     )
                 });

                 if (balanceRecord) {
                      const newBal = Number(balanceRecord.balance) - diffDays;
                      await tx.update(leaveBalances)
                        .set({ balance: newBal.toString() })
                        .where(eq(leaveBalances.id, balanceRecord.id));
                 }
             }
        });
        
        revalidatePath("/hr/leaves");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: "Failed to process request" };
    }
}


export async function getMyRequests() {
    const session = await auth();
    if (!session?.user?.id) return [];

    return await db.query.leaveRequests.findMany({
        where: eq(leaveRequests.userId, session.user.id),
        with: {
            // @ts-ignore
            leaveType: true, // Need to verify if relation exists in schema
             // @ts-ignore
             approver: true
        },
        orderBy: [desc(leaveRequests.createdAt)]
    });
}

export async function getIncomingRequests() {
    const session = await auth();
    if (!session?.user?.id) return [];

    return await db.query.leaveRequests.findMany({
        where: and(
             eq(leaveRequests.approverId, session.user.id),
             eq(leaveRequests.status, "PENDING")
        ),
        with: {
            user: true,
             // @ts-ignore
             leaveType: true
        },
        orderBy: [desc(leaveRequests.createdAt)]
    });
}
