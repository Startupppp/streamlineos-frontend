const GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const CLAIM_REFRESH_TIMEOUT_MS = 18_000;

export type GateCookieBase = "org-setup-done" | "onboarding-done";

export function gateCookieName(base: GateCookieBase, scopeId: string): string {
  return `${base}--${scopeId}`;
}

type SessionUpdate = (data?: unknown) => Promise<unknown>;

function secureFlag(): string {
  return typeof window !== "undefined" && window.location.protocol === "https:"
    ? "; Secure"
    : "";
}

export function clearGateCookies(): void {
  const secure = secureFlag();
  document.cookie = `org-setup-done=; path=/; max-age=0; SameSite=Lax${secure}`;
  document.cookie = `onboarding-done=; path=/; max-age=0; SameSite=Lax${secure}`;
}

export async function completeOnboardingGate(
  cookieName: GateCookieBase,
  scopeId: string,
  update: SessionUpdate,
): Promise<void> {
  const name = gateCookieName(cookieName, scopeId);
  const secure = secureFlag();
  document.cookie = `${name}=1; path=/; max-age=${GATE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  await Promise.race([
    update().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), CLAIM_REFRESH_TIMEOUT_MS)),
  ]);
}
