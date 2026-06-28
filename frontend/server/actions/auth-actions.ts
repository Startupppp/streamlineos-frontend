"use server";

import { serverApiClient } from "@/lib/api/server-client";
import { validatePasswordStrength } from "@/lib/password-utils";

export async function resetPassword(password: string) {
  const validation = validatePasswordStrength(password ?? "");
  if (!validation.valid) {
    return { error: validation.missing[0] ?? "Password does not meet requirements" };
  }

  try {
    await serverApiClient.patch<{ success: true }>("/me/force-change-password", { newPassword: password });
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update password" };
  }
}
