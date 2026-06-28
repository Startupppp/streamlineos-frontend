"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";
import { PASSWORD_RULES, validatePasswordStrength } from "@/lib/password-utils";

export async function resetPassword(password: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validation = validatePasswordStrength(password ?? "");
  if (!validation.valid) {
    return { error: validation.missing[0] ?? `Password must be at least ${PASSWORD_RULES.minLength} characters` };
  }

  try {
     const hashedPassword = await bcrypt.hash(password, 12);

     await db.update(users)
        .set({
           password: hashedPassword,
           isPasswordChangeRequired: false,
        })
        .where(eq(users.id, session.user.id));

     return { success: true };
  } catch (error) {
      logger.error("Failed to reset password", error);
      return { error: "Failed to reset password" };
  }
}

