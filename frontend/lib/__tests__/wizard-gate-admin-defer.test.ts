import { resolveWizardGate } from "@/lib/wizard-gate";
import { gateCookieName } from "@/lib/onboarding-gate";

const ORG = "org-qa";
const USER = "usr-admin";

function cookies(present: string[] = []) {
  const set = new Set(present);
  return { get: (name: string) => (set.has(name) ? { value: "1" } : undefined) };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    orgId: ORG,
    organizationAccess: "active",
    orgOnboardingCompletedAt: "2026-09-01T00:00:00.000Z",
    userOnboardingCompletedAt: null,
    enabledModules: ["hr"],
    user: { id: USER, isOrgOwner: false, role: "ORG_ADMIN" },
    ...overrides,
  };
}

const DEFERRED = gateCookieName("onboarding-deferred", `${USER}--${ORG}`);

describe("an org admin may defer their own onboarding wizard", () => {
  it("still sends an admin to the wizard the first time", () => {
    expect(resolveWizardGate(session() as never, cookies(), "/hr")).toBe("/employee-onboarding");
  });

  it("lets an admin who chose later go on to /hr", () => {
    expect(resolveWizardGate(session() as never, cookies([DEFERRED]), "/hr")).toBeNull();
  });

  it("lets a MEMBER who chose later go on — BUG-018 / FE-122", () => {
    const member = session({ user: { id: USER, isOrgOwner: false, role: "MEMBER" } });
    expect(resolveWizardGate(member as never, cookies([DEFERRED]), "/hr")).toBeNull();
  });

  it("does not let a deferral skip org setup, which is a different gate", () => {
    const owner = session({
      user: { id: USER, isOrgOwner: true, role: "ORG_ADMIN" },
      orgOnboardingCompletedAt: null,
    });
    expect(resolveWizardGate(owner as never, cookies([DEFERRED]), "/org-setup")).toBe("/org-setup");
  });

  it("does not let a deferral outrank a suspended organization", () => {
    const suspended = session({ organizationAccess: "suspended" });
    expect(resolveWizardGate(suspended as never, cookies([DEFERRED]), "/hr")).toBe("/access-suspended");
  });

  it("still honours the completed cookie for an admin who finished properly", () => {
    const done = gateCookieName("onboarding-done", `${USER}--${ORG}`);
    expect(resolveWizardGate(session() as never, cookies([done]), "/hr")).toBeNull();
  });
});
