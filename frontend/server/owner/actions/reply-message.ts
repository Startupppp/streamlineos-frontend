"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { serverApiClient } from "@/lib/api/server-client";
import { requirePlatformOwner } from "@/lib/platform/session";

const schema = z.object({
  publicCode: z.string().min(1),
  body: z.string().min(1).max(10_000),
});

export type ReplyResult =
  | { ok: true }
  | { ok: false; error: string };

export async function replyToMessage(raw: unknown): Promise<ReplyResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const session = await requirePlatformOwner();
  const ownerId = session.user!.id as string;

  try {
    await serverApiClient.post(`/platform/messages/${parsed.data.publicCode}/reply`, {
      body: parsed.data.body,
      repliedById: ownerId,
    });
  } catch {
    return {
      ok: false,
      error: "Email could not be sent. Check that RESEND_API_KEY (or SENDGRID_API_KEY) is set in .env.",
    };
  }

  revalidatePath("/owner/inbox");
  revalidatePath(`/owner/inbox/${parsed.data.publicCode}`);
  revalidateTag("owner-metrics", "default");
  return { ok: true };
}

export async function markMessageStatus(
  publicCode: string,
  status: "READ" | "ARCHIVED" | "NEW",
): Promise<ReplyResult> {
  await requirePlatformOwner();
  await serverApiClient.patch(`/platform/messages/${publicCode}/status`, { status });
  revalidatePath("/owner/inbox");
  revalidateTag("owner-metrics", "default");
  return { ok: true };
}
