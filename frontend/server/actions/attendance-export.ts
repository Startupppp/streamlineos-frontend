"use server";

import { z } from "zod";
import { getAuthenticatedMember } from "@/lib/auth-helpers";
import { isAuthError } from "@/lib/auth-types";
import { serverApiClient } from "@/lib/api/server-client";

const emailReportSchema = z.object({
  to: z.array(z.string().email()).min(1, "At least one To recipient is required"),
  cc: z.array(z.string().email()).default([]),
  bcc: z.array(z.string().email()).default([]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type AttendanceEmailReportInput = z.infer<typeof emailReportSchema>;

export async function emailAttendanceReport(
  input: AttendanceEmailReportInput,
): Promise<{ success: boolean; error?: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) return { success: false, error: authResult.error };

  const parsed = emailReportSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await serverApiClient.post("/hr/attendance/email-report", parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send report" };
  }
}
