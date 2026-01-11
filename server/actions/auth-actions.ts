"use server";

import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function resetPassword(password: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  
  try {
     const hashedPassword = await bcrypt.hash(password, 10);
     
     await db.update(users)
        .set({
           password: hashedPassword,
           isPasswordChangeRequired: false,
        })
        .where(eq(users.id, session.user.id));
        
     return { success: true };
  } catch {
      return { error: "Failed to reset password" };
  }
}

export async function createEmployee(data: {
    firstName: string;
    lastName: string;
    email: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    role: "ADMIN" | "MEMBER";
    initialPassword?: string;
}) {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
        return { error: "Unauthorized: Insufficient permissions" };
    }

    try {
        const existing = await db.query.users.findFirst({
            where: eq(users.email, data.email)
        });
        if (existing) {
            return { error: "User with this email already exists" };
        }

        const rawPassword = data.initialPassword || "123456"; 
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const creatorOrg = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.userId, session.user.id)
        });
        
        if (!creatorOrg) return { error: "Organization context not found" };

        const newUserId = crypto.randomUUID();
        
        await db.insert(users).values({
            id: newUserId,
            email: data.email,
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            name: `${data.firstName} ${data.lastName}`,
            role: data.role,
            gender: data.gender,
            isPasswordChangeRequired: true,
            emailVerified: null, 
        });

        await db.insert(organizationMembers).values({
            userId: newUserId,
            orgId: creatorOrg.orgId,
            role: data.role,
        });

        revalidatePath("/hr");
        return { success: true };

    } catch (err) {
        return { error: "Failed to create employee" };
    }
}
