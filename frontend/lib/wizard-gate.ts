import "server-only";
import type { Session } from "next-auth";
import { gateCookieName } from "@/lib/onboarding-gate";

export type WizardGate =
  | "/access-suspended"
  | "/org-setup"
  | "/employee-onboarding"
  | null;

interface GateCookieReader {
  get(name: string): { value: string } | undefined;
}

export function resolveWizardGate(
  session: Session,
  cookieStore: GateCookieReader,
): WizardGate {
  const orgId = session.orgId ?? null;
  const userId = session.user?.id ?? "";
  const isOrgOwner = session.user?.isOrgOwner === true;

  if (session.organizationAccess === "suspended") return "/access-suspended";

  if (!orgId) return "/org-setup";

  if (isOrgOwner && !session.orgOnboardingCompletedAt) {
    const setupDone = Boolean(
      cookieStore.get(gateCookieName("org-setup-done", orgId))?.value,
    );
    if (!setupDone) return "/org-setup";
  }

  if (!isOrgOwner && !session.userOnboardingCompletedAt && userId) {
    const onboardingDone = Boolean(
      cookieStore.get(gateCookieName("onboarding-done", `${userId}--${orgId}`))
        ?.value,
    );
    if (!onboardingDone) return "/employee-onboarding";
  }

  return null;
}
