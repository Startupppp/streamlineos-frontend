import "server-only";
import type { Session } from "next-auth";
import { gateCookieName, mayDeferOwnOnboarding } from "@/lib/onboarding-gate";

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
    const scope = `${userId}--${orgId}`;
    const onboardingDone = Boolean(
      cookieStore.get(gateCookieName("onboarding-done", scope))?.value,
    );
    // HRMS-E2E-020, decision #7 (PROVISIONAL). An ORG_ADMIN brought in to set up
    // HR had to hand over their own date of birth, bank account and PAN before
    // they could open the module they were hired to configure — every /hr URL
    // redirected here until the wizard was finished, and there was no skip.
    //
    // They may now defer. A MEMBER may not: the standing is checked here, not
    // just the cookie, so the marker is not a bypass anyone can mint for
    // themselves. The wizard stays reachable and stays incomplete — deferring is
    // not finishing, and nothing downstream is told otherwise.
    const deferred =
      mayDeferOwnOnboarding(session) &&
      Boolean(cookieStore.get(gateCookieName("onboarding-deferred", scope))?.value);
    if (!onboardingDone && !deferred) return "/employee-onboarding";
  }

  return null;
}
