import { signInPathForMissingSession } from "@/lib/auth-session-cookies";
import { clearGateCookies } from "@/lib/onboarding-gate";
import { clearRegisteredQueryCache } from "@/lib/query-cache-control";

const SIGN_OUT_WAIT_MS = 4_000;

export async function signOutStaleSession(): Promise<void> {
  clearRegisteredQueryCache();
  clearGateCookies();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { signOut } = await import("next-auth/react");
    await Promise.race([
      signOut({ redirect: false }),
      new Promise((resolve) => {
        timer = setTimeout(resolve, SIGN_OUT_WAIT_MS);
      }),
    ]);
  } catch {
  } finally {
    clearTimeout(timer);
    window.location.assign(signInPathForMissingSession());
  }
}
