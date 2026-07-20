import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { AuthError, type Session } from "next-auth";
import { auth } from "@/lib/auth";
import { isSessionCookieName } from "@/lib/auth-session-cookies";

function isJwtSessionError(error: unknown): boolean {
  if (error instanceof AuthError) {
    return error.type === "JWTSessionError";
  }
  return error instanceof Error && error.name === "JWTSessionError";
}

async function clearStaleSessionCookies(): Promise<void> {
  try {
    const jar = await cookies();
    for (const cookie of jar.getAll()) {
      if (isSessionCookieName(cookie.name)) {
        jar.delete(cookie.name);
      }
    }
  } catch {
    return;
  }
}

export const getServerAuth = cache(async (): Promise<Session | null> => {
  try {
    return (await auth()) ?? null;
  } catch (error) {
    if (!isJwtSessionError(error)) {
      throw error;
    }
    await clearStaleSessionCookies();
    return null;
  }
});
