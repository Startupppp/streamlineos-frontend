const GATE_COOKIE_MAX_AGE = 5 * 60;

export type GateCookieBase = "org-setup-done" | "onboarding-done";

export function gateCookieName(base: GateCookieBase, scopeId: string): string {
  return `${base}--${scopeId}`;
}

// Structural mirror of `SessionClaimsRefresh`; importing the type would close a cycle with auth-hooks.
type SessionClaimsRefreshFn = (data?: unknown) => Promise<unknown>;

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

export async function completeOnboardingGate(
  cookieName: GateCookieBase,
  scopeId: string,
  refreshSessionClaims: SessionClaimsRefreshFn,
): Promise<void> {
  const name = gateCookieName(cookieName, scopeId);
  const secure = secureFlag();
  document.cookie = `${name}=1; path=/; max-age=${GATE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  await refreshSessionClaims();
}
