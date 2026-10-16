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

function isHrSurface(path: string): boolean {
  return (
    path === "/hr" ||
    path.startsWith("/hr/") ||
    path === "/employee-onboarding" ||
    path.startsWith("/employee-onboarding/")
  );
}

export function resolveWizardGate(
  session: Session,
  cookieStore: GateCookieReader,
  destination: string,
): WizardGate {
  const orgId = session.orgId ?? null;
  const userId = session.user?.id ?? "";
  const isOrgOwner = session.user?.isOrgOwner === true;

  if (session.organizationAccess === "suspended") return "/access-suspended";

  if (session.isPlatformAdmin === true && !orgId) return "/owner";

  if (!orgId) return "/org-setup";

  if (isOrgOwner && !session.orgOnboardingCompletedAt) {
    const setupDone = Boolean(
      cookieStore.get(gateCookieName("org-setup-done", orgId))?.value,
    );
    if (!setupDone) return "/org-setup";
  }

  if (isHrSurface(destination)) {
    const hrEnabled = (session.enabledModules ?? []).includes("hr");
    if (!isOrgOwner && hrEnabled && !session.userOnboardingCompletedAt && userId) {
      const scope = `${userId}--${orgId}`;
      const onboardingDone = Boolean(
        cookieStore.get(gateCookieName("onboarding-done", scope))?.value,
      );
      const deferred =
        mayDeferOwnOnboarding(session) &&
        Boolean(cookieStore.get(gateCookieName("onboarding-deferred", scope))?.value);
      if (!onboardingDone && !deferred) return "/employee-onboarding";
    }
  }

  return null;
}
