import type { Session } from "next-auth";

export const GATE_COOKIE_MAX_AGE = 5 * 60;
export const ONBOARDING_DEFERRED_MAX_AGE = 7 * 24 * 60 * 60;

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
  maxAge = GATE_COOKIE_MAX_AGE,
): void {
  if (typeof document === "undefined") return;
  const name = gateCookieName(cookieName, scopeId);
  const secure = secureFlag();
  document.cookie = `${name}=1; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
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

export function mayDeferOwnOnboarding(session: Session | null | undefined): boolean {
  return session?.user?.isOrgOwner !== true;
}
