import type { Session } from "next-auth";

const GATE_COOKIE_MAX_AGE = 5 * 60;

/**
 * HRMS-E2E-020. `onboarding-deferred` is deliberately separate from
 * `onboarding-done`: an ORG_ADMIN who presses "I'll do this later" has not
 * completed the wizard, and writing the "done" marker would tell the rest of
 * the product they had. `userOnboardingCompletedAt` stays null, the wizard stays
 * reachable, and nothing downstream is led to believe the bank details exist.
 */
export type GateCookieBase =
  | "org-setup-done"
  | "onboarding-done"
  | "onboarding-deferred";

export function gateCookieName(base: GateCookieBase, scopeId: string): string {
  return `${base}--${scopeId}`;
}

function secureFlag(): string {
  return typeof window !== "undefined" && window.location.protocol === "https:"
    ? "; Secure"
    : "";
}

const GATE_COOKIE_BASES: readonly GateCookieBase[] = [
  "org-setup-done",
  "onboarding-done",
];

/**
 * Every gate cookie this module writes is scoped — `completeOnboardingGate`
 * stores `${base}--${scopeId}` and `resolveWizardGate` reads that same name. It
 * used to expire the two BARE bases, which no code has written since the cookie
 * was scoped, so sign-out and org-switch both cleared nothing and a skipped
 * wizard stayed skipped for the next person in the browser. The scope id is not
 * known at either call site, so the names are read back off `document.cookie`.
 */
export function clearGateCookies(): void {
  if (typeof document === "undefined") return;
  const secure = secureFlag();
  const names = new Set<string>();
  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0]?.trim();
    if (!name) continue;
    for (const base of GATE_COOKIE_BASES)
      if (name === base || name.startsWith(`${base}--`)) names.add(name);
  }
  for (const base of GATE_COOKIE_BASES) names.add(base);
  for (const name of names)
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secure}`;
}

export function writeGateCookie(
  cookieName: GateCookieBase,
  scopeId: string,
): void {
  if (typeof document === "undefined") return;
  const name = gateCookieName(cookieName, scopeId);
  const secure = secureFlag();
  document.cookie = `${name}=1; path=/; max-age=${GATE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export function clearGateCookie(
  cookieName: GateCookieBase,
  scopeId: string,
): void {
  if (typeof document === "undefined") return;
  const name = gateCookieName(cookieName, scopeId);
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secureFlag()}`;
}

export async function completeOnboardingGate<TExpected, TResult>(
  cookieName: GateCookieBase,
  scopeId: string,
  refreshSessionClaims: (expected?: TExpected) => Promise<TResult>,
  expected?: TExpected,
): Promise<TResult> {
  writeGateCookie(cookieName, scopeId);
  return refreshSessionClaims(expected);
}

/**
 * Who may put their own onboarding wizard off until later (HRMS-E2E-020,
 * decision #7, PROVISIONAL).
 *
 * Lives here, beside the cookie names, so `resolveWizardGate` and the control
 * that writes the deferral ask one question rather than two. Two copies of the
 * rule would let the button appear for somebody the gate then refuses — they
 * would press "Skip for now" and stay exactly where they were, which is a worse
 * bug than the one being fixed.
 *
 * The standing is read from the session because the gate runs in the routing
 * layer, where FE-10 says nothing else exists: the JWT carries no permissions
 * claim, so no permission key can be consulted there. `isOrgOwner` is read the
 * same way for the same reason. This is the one place that reads the slug, and
 * it is why a client component calls this instead of comparing roles itself
 * (FE-52).
 */
export function mayDeferOwnOnboarding(session: Session | null | undefined): boolean {
  return session?.user?.role === "ORG_ADMIN";
}
