import { signInPathForMissingSession } from "@/lib/auth-session-cookies";
import { clearGateCookies } from "@/lib/onboarding-gate";
import { clearRegisteredQueryCache } from "@/lib/query-cache-control";

const SIGN_OUT_WAIT_MS = 4_000;

/**
 * The escape hatch for a session the backend no longer honours. Unlike
 * `useSignOut` it never calls the backend (which is what is failing) and never
 * waits on it: it asks Auth.js to drop the cookie, gives that a bounded wait,
 * then hard-navigates to `/signin?session=expired`, where the proxy expires any
 * session cookie that survived instead of bouncing back to /dashboard.
 */
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
    // The proxy clears the cookie on arrival; a failed Auth.js call must not strand the user.
  } finally {
    clearTimeout(timer);
    window.location.assign(signInPathForMissingSession());
  }
}
