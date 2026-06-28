"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendAccountDeactivationEmail } from "@/lib/email";
import { ROLES, ADMIN_ROLES, EXPENSE_ADMIN_ROLES } from "@/lib/constants/roles";
import { encrypt, decrypt, encryptBankDetails, decryptBankDetails } from "@/lib/encryption";
import { getSessionAbility } from "@/lib/abilities-server";
import { serverApiClient } from "@/lib/api/server-client";
import { db } from "@/lib/db";
import { users, organizationMembers, departments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

type BackendEmployeeDetail = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string | null;
  designation: string | null;
  employeeId: string | null;
  departmentId: number | null;
  image: string | null;
  isActive: boolean;
  joiningDate: string | null;
  hasDashboardAccess: boolean;
  reportingTo: string | null;
  monthlySalary: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  skills: string[] | null;
  phone: string | null;
};

export async function getEmployeeById(userId: string): Promise<BackendEmployeeDetail & { gender: null; experienceYears: null; taxId: null; bankDetails: null } | null> {
  try {
    const response = await serverApiClient.get<BackendEmployeeDetail>(`/hr/employees/${userId}`);
    if (!response) return null;
    return {
      ...response,
      gender: null,
      experienceYears: null,
      taxId: null,
      bankDetails: null,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) return null;
    throw error;
  }
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
    monthlySalary?: number;
    bankDetails?: {
        accountNumber: string;
        bankName: string;
        branch: string;
        ifsc: string;
        accountHolder: string;
    };
}) {
    const session = await auth();
    if (!session?.user?.id || !EXPENSE_ADMIN_ROLES.includes(session.user.role ?? "")) {
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
                taxId: data.taxId ? encrypt(data.taxId) : undefined,
                monthlySalary: data.monthlySalary !== undefined ? String(data.monthlySalary) : undefined,
                bankDetails: data.bankDetails ? encryptBankDetails(data.bankDetails) : undefined,
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
  if (!EXPENSE_ADMIN_ROLES.includes(role ?? "")) {
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
    if (employee.role === ROLES.CEO) return { error: "Cannot modify dashboard access for the CEO" };

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
  const ability = await getSessionAbility();
  if (!ability.can("manage", "hr:employees")) {
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
      if (role !== ROLES.CEO && employee.role === ROLES.CEO) {
        return { error: "Only the CEO can delete other CEO/Owner accounts" };
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
