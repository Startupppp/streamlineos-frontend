import "server-only";
import type { Session } from "next-auth";
import { gateCookieName } from "@/lib/onboarding-gate";

export type WizardGate =
  | "/access-suspended"
  | "/org-setup"
  | "/employee-onboarding"
  | "/owner"
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

  // Root section 8: the onboarding wizards are never shown to a platform
  // operator. They hold PLATFORM_ONLY_PERMISSION_KEYS by deployment allowlist
  // rather than by membership, so an operator without an organization has
  // nothing to set up and belongs on their own route.
  if (session.isPlatformAdmin === true && !orgId) return "/owner";

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
