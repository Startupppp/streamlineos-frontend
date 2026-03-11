"use server";

import { db } from "@/lib/db";
import { users, organizationMembers, departments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendAccountDeactivationEmail } from "@/lib/email";

export async function getEmployees() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id)
  });
  if (!member) return [];

  const orgMembers = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, member.orgId),
    with: {
        user: {
          with: {
            department: true,
          },
        },
    }
  });
  return orgMembers.map(m => m.user);
}

export async function getEmployeeById(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const requesterOrgMember = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id)
  });

  if (!requesterOrgMember) return null;
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
    role: string;
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
        branch: string;
        ifsc: string;
        accountHolder: string;
    };
}) {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "CEO" && session.user.role !== "ADMIN")) {
        return { error: "Unauthorized" };
    }

    try {
        const requesterOrgMember = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.userId, session.user.id)
        });

        if (!requesterOrgMember) return { error: "Organization context not found" };

        const targetOrgMember = await db.query.organizationMembers.findFirst({
            where: and(
                eq(organizationMembers.userId, data.id),
                eq(organizationMembers.orgId, requesterOrgMember.orgId)
            )
        });

        if (!targetOrgMember) return { error: "Employee not found in your organization" };

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
                joiningDate: data.joiningDate ? data.joiningDate.toISOString().split('T')[0] : undefined,
                skills: data.skills,
                experienceYears: data.experienceYears ? String(data.experienceYears) : undefined,
                taxId: data.taxId,
                bankDetails: data.bankDetails,
            })
            .where(eq(users.id, data.id));

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
        return { error: "Failed to update employee" };
    }
}

export async function toggleDashboardAccess(userId: string, hasDashboardAccess: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const { role, id: currentUserId } = session.user;
  if (role !== "CEO" && role !== "ADMIN" && role !== "HR") {
    return { error: "Permission denied" };
  }
  if (userId === currentUserId) {
    return { error: "You cannot toggle your own dashboard access" };
  }

  try {
    const requesterOrgMember = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (!requesterOrgMember) return { error: "Organization context not found" };

    const targetOrgMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.orgId, requesterOrgMember.orgId)
      ),
    });
    if (!targetOrgMember) return { error: "Employee not found in your organization" };

    const employee = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!employee) return { error: "User not found" };
    if (employee.role === "CEO") return { error: "Cannot modify dashboard access for the CEO" };

    await db.update(users)
      .set({ hasDashboardAccess })
      .where(eq(users.id, userId));

    revalidatePath("/hr");
    return { success: true };
  } catch {
    return { error: "Failed to toggle dashboard access" };
  }
}

export async function deleteEmployee(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const { role, id: currentUserId } = session.user;
  if (role !== "CEO" && role !== "ADMIN") {
      return { error: "Permission denied" };
  }
  if (userId === currentUserId) {
      return { error: "You cannot delete your own account" };
  }

  try {
      const requesterOrgMember = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id),
      });
      if (!requesterOrgMember) return { error: "Organization context not found" };

      const targetOrgMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.orgId, requesterOrgMember.orgId)
        ),
      });
      if (!targetOrgMember) return { error: "Employee not found in your organization" };

      const employee = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!employee) {
        return { error: "User not found" };
      }
      if (role === "ADMIN" && (employee.role === "ADMIN" || employee.role === "CEO")) {
        return { error: "Admins can only delete Member accounts" };
      }
      if (role === "CEO" && employee.role === "CEO") {
        return { error: "Cannot delete another Owner account" };
      }
      await db.update(users)
        .set({ isActive: false })
        .where(eq(users.id, userId));
      if (employee?.email) {
        await sendAccountDeactivationEmail(
          employee.email,
          employee.name || "Employee",
          session.user.name || "Administrator"
        );
      }

      revalidatePath("/hr/employees");
      return { success: true };
  } catch (error) {
      return { error: "Failed to delete employee" };
  }
}
