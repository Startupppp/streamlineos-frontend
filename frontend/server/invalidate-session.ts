"use server";

import { auth, signOut } from "@/lib/auth";

export async function invalidateCurrentUserSession(): Promise<void> {
  const session = await auth();
  if (session) {
    await signOut({ redirect: false });
  }
}
