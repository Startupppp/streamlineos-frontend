"use server";

import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getEmployees() {
  const session = await auth();
  if (!session?.user?.id) return [];
  
  // Get org context
  const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id)
  });
  
  if (!member) return [];

  const orgMembers = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, member.orgId),
    with: {
        user: true
    }
  });

  // Filter out inactive users
  return orgMembers.map(m => m.user).filter(u => u.isActive !== false);
}

export async function getEmployeeById(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  // We need to verify the requester has access to this user's org.
  // 1. Get requester's org
  const requesterOrgMember = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id)
  });

  if (!requesterOrgMember) return null;

  // 2. Fetch target user if they are in the same org
  // 2. Fetch target user if they are in the same org
  const rows = await db.select({
      user: users
  })
  .from(users)
  .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
  .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.orgId, requesterOrgMember.orgId)
  ))
  .limit(1);

  if (rows.length === 0) return null;

  return rows[0].user;



}

export async function updateEmployee(data: {
    id: string;
    firstName: string;
    lastName: string;
    role: "ADMIN" | "MEMBER";
    designation?: string;
    departmentId?: number;
    phone?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    joiningDate?: Date;
    skills?: string[];
    experienceYears?: number;
    taxId?: string;
    bankDetails?: {
        accountNumber: string;
        bankName: string;
        ifsc: string;
        accountHolder: string;
    };
}) {
    const session = await auth();
    // RBAC: Only OWNER or ADMIN can edit
    if (!session?.user?.id || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
        return { error: "Unauthorized" };
    }

    try {
        await db.update(users)
            .set({
                firstName: data.firstName,
                lastName: data.lastName,
                name: `${data.firstName} ${data.lastName}`,
                role: data.role,
                designation: data.designation,
                departmentId: data.departmentId,
                phone: data.phone,
                gender: data.gender,
                joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
                skills: data.skills,
                experienceYears: data.experienceYears ? String(data.experienceYears) : undefined, // Schema uses decimal/string
                taxId: data.taxId,
                bankDetails: data.bankDetails,
            })
            .where(eq(users.id, data.id));
        
        // Also update role in organizationMembers
        // Find the record for this user in the current org context
        // (Assuming 1 org for now, but safer to lookup)
        
        // We need the orgId context. 
        const requesterOrgMember = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.userId, session.user.id)
        });

        if (requesterOrgMember) {
             await db.update(organizationMembers)
                .set({ role: data.role })
                .where(and(
                    eq(organizationMembers.userId, data.id),
                    eq(organizationMembers.orgId, requesterOrgMember.orgId)
                ));
        }

        revalidatePath("/hr/employees");
        revalidatePath(`/hr/employees/${data.id}`);
        return { success: true };
    } catch (e) {
        console.error("Update Employee Error:", e);
        return { error: "Failed to update employee" };
    }
}

export async function deleteEmployee(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const { role } = session.user;

  if (role !== "OWNER" && role !== "ADMIN") {
      return { error: "Permission denied" };
  }

  try {
      // Soft delete
      await db.update(users)
        .set({ isActive: false })
        .where(eq(users.id, userId));
      
      revalidatePath("/hr/employees");
      return { success: true };
  } catch (error) {
      console.error("Delete employee error:", error);
      return { error: "Failed to delete employee" };
  }
}
