"use server";

import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// --- For User: Reset Password ---
export async function resetPassword(password: string, imageUrl?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  
  try {
     const hashedPassword = await bcrypt.hash(password, 10);
     
     await db.update(users)
        .set({
           password: hashedPassword,
           isPasswordChangeRequired: false,
           ...(imageUrl && { image: imageUrl }),
        })
        .where(eq(users.id, session.user.id));
        
     return { success: true };
  } catch (err) {
      console.error("Reset password error:", err);
      return { error: "Failed to reset password" };
  }
}


// --- For HR: Create Employee ---
export async function createEmployee(data: {
    firstName: string;
    lastName: string;
    email: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    role: "ADMIN" | "MEMBER";
    initialPassword?: string;
}) {
    const session = await auth();
     // Only owner or admin can create users
    if (!session?.user?.id || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
        return { error: "Unauthorized: Insufficient permissions" };
    }

    try {
        // 1. Check if email exists
        const existing = await db.query.users.findFirst({
            where: eq(users.email, data.email)
        });
        if (existing) {
            return { error: "User with this email already exists" };
        }

        // 2. Hash password
        // Use provided password or default '123456'
        const rawPassword = data.initialPassword || "123456"; 
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // 3. Create User in current Org
        // Assuming session.user is in 'vaivamm' org context.
        // We need the orgId.
        // Option A: Pass orgId from UI. 
        // Option B: Infer from session's context if we had one.
        // Let's look up the orgId of the creator.
        const creatorOrg = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.userId, session.user.id)
        });
        
        if (!creatorOrg) return { error: "Organization context not found" };

        const newUserId = crypto.randomUUID();
        
        // Insert User
        await db.insert(users).values({
            id: newUserId,
            email: data.email,
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            name: `${data.firstName} ${data.lastName}`,
            role: data.role,
            gender: data.gender,
            isPasswordChangeRequired: true, // FORCE RESET
            emailVerified: null, 
        });

        // Add to Organization Members
        await db.insert(organizationMembers).values({
            userId: newUserId,
            orgId: creatorOrg.orgId,
            role: data.role,
        });

        revalidatePath("/hr");
        return { success: true };

    } catch (err) {
        console.error("Create Employee Error:", err);
        return { error: "Failed to create employee" };
    }
}
