"use server";
import { auth, invalidateUserSession } from "@/lib/auth";

export async function invalidateCurrentUserSession(): Promise<void> {
  const session = await auth();
  if (session?.user?.id) {
    await invalidateUserSession(session.user.id);
  }
}
