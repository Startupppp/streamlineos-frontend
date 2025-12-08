"use server";

import { db } from "@/lib/db";
import { users, departments } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateEmployeeProfile(userId: string, data: {
  designation?: string;
  departmentId?: number;
  phone?: string;
}) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");

  // Verify the user exists (optional, update will implicitly check)
  
  await db.update(users)
    .set({
      designation: data.designation,
      departmentId: data.departmentId,
      phone: data.phone,
    })
    .where(eq(users.id, userId)); // In V2 simplified schema we assume user ID is unique.

  revalidatePath(`/hr/employees/${userId}`);
}

export async function getDepartments() {
    const { orgId } = await auth();
    if (!orgId) return [];
    
    return await db.query.departments.findMany({
        where: eq(departments.orgId, orgId)
    });
}

export async function createDepartment(name: string) {
    const { orgId, userId } = await auth();
    if (!orgId) throw new Error("Unauthorized");
    
    await db.insert(departments).values({
        orgId,
        name,
        managerId: userId // Default to creator?
    });
    
    revalidatePath("/hr/employees");
}
