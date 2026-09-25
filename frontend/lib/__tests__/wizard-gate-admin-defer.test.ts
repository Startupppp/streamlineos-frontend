/**
 * HRMS-E2E-020. Every new user, ORG_ADMIN included, was redirected to
 * `/employee-onboarding`, and every `/hr` URL kept redirecting there until the
 * wizard was finished. There was no skip. An administrator brought in to set up
 * HR had to hand over their own date of birth, bank account and PAN before they
 * could open the module they were hired to configure.
 *
 * Decision #7's recommended default is that an ORG_ADMIN may skip or defer,
 * while a MEMBER stays guided. This is that, shipped PROVISIONAL.
 *
 * `resolveWizardGate` is the only authority for these two routes (FE-11) —
 * putting the exception anywhere else gives two decision points over two sources
 * and `ERR_TOO_MANY_REDIRECTS`, which is why the deferral is expressed here and
 * nowhere else.
 *
 * The deferral is its own cookie, not the existing "done" one. Marking the
 * wizard complete when somebody pressed "later" would tell the rest of the
 * product a falsehood — `userOnboardingCompletedAt` stays null, the wizard stays
 * reachable, and nothing downstream is led to believe the bank details exist.
 */
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
    user: { id: USER, isOrgOwner: false, role: "ORG_ADMIN" },
    ...overrides,
  };
}

const DEFERRED = gateCookieName("onboarding-deferred", `${USER}--${ORG}`);

describe("an org admin may defer their own onboarding wizard", () => {
  it("still sends an admin to the wizard the first time", () => {
    // The paired positive. The wizard is deferrable, not removed — an admin who
    // has not chosen to skip still lands there, which is what keeps the bank
    // details worth collecting at all.
    expect(resolveWizardGate(session() as never, cookies())).toBe("/employee-onboarding");
  });

  it("lets an admin who chose later go on to /hr", () => {
    expect(resolveWizardGate(session() as never, cookies([DEFERRED]))).toBeNull();
  });

  it("keeps a member in the wizard even with the deferral cookie set", () => {
    // The cookie is not a bypass anybody can mint for themselves: the gate
    // checks the standing, not just the cookie.
    const member = session({ user: { id: USER, isOrgOwner: false, role: "MEMBER" } });
    expect(resolveWizardGate(member as never, cookies([DEFERRED]))).toBe("/employee-onboarding");
  });

  it("does not let a deferral skip org setup, which is a different gate", () => {
    const owner = session({
      user: { id: USER, isOrgOwner: true, role: "ORG_ADMIN" },
      orgOnboardingCompletedAt: null,
    });
    expect(resolveWizardGate(owner as never, cookies([DEFERRED]))).toBe("/org-setup");
  });

  it("does not let a deferral outrank a suspended organization", () => {
    const suspended = session({ organizationAccess: "suspended" });
    expect(resolveWizardGate(suspended as never, cookies([DEFERRED]))).toBe("/access-suspended");
  });

  it("still honours the completed cookie for an admin who finished properly", () => {
    const done = gateCookieName("onboarding-done", `${USER}--${ORG}`);
    expect(resolveWizardGate(session() as never, cookies([done]))).toBeNull();
  });
});
