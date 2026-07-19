const GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const CLAIM_REFRESH_TIMEOUT_MS = 2500;

type SessionUpdate = (data?: unknown) => Promise<unknown>;

export async function completeOnboardingGate(
  cookieName: "org-setup-done" | "onboarding-done",
  update: SessionUpdate,
): Promise<void> {
  document.cookie = `${cookieName}=1; path=/; max-age=${GATE_COOKIE_MAX_AGE}; SameSite=Lax`;
  await Promise.race([
    update().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), CLAIM_REFRESH_TIMEOUT_MS)),
  ]);
}
