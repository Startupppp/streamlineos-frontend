import {
  clearGateCookies,
  completeOnboardingGate,
  gateCookieName,
} from "./onboarding-gate";

/**
 * `clearGateCookies` runs on sign-out and on an organization switch. Both call
 * sites know nothing about the scope id, while every gate cookie written since
 * the cookie was scoped is `${base}--${scopeId}` — so expiring the two bare
 * bases cleared nothing at all, and the skipped-wizard mark of the person who
 * just signed out was still on the browser for the next one.
 *
 * The read side is already pinned by `wizard-gate.test.ts`, which resolves the
 * gate through `gateCookieName`. This is the clear side.
 */

const ORG_ID = "org-abc";
const OTHER_ORG_ID = "org-xyz";
const USER_ID = "user-123";

function cookieNames(): string[] {
  return document.cookie
    .split(";")
    .map((pair) => pair.split("=")[0]?.trim() ?? "")
    .filter(Boolean);
}

function seed(name: string): void {
  document.cookie = `${name}=1; path=/; max-age=3600; SameSite=Lax`;
}

function wipeAll(): void {
  for (const name of cookieNames())
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

describe("clearGateCookies", () => {
  beforeEach(wipeAll);
  afterEach(wipeAll);

  it("ANTI-VACUITY: jsdom really stores and really expires a cookie", () => {
    seed("probe");
    expect(cookieNames()).toContain("probe");
    document.cookie = "probe=; path=/; max-age=0; SameSite=Lax";
    expect(cookieNames()).not.toContain("probe");
  });

  it("expires every scoped gate cookie, whatever the scope id is", () => {
    const scoped = [
      gateCookieName("org-setup-done", ORG_ID),
      gateCookieName("org-setup-done", OTHER_ORG_ID),
      gateCookieName("onboarding-done", USER_ID),
    ];
    for (const name of scoped) seed(name);
    expect(cookieNames()).toEqual(expect.arrayContaining(scoped));

    clearGateCookies();

    for (const name of scoped) expect(cookieNames()).not.toContain(name);
  });

  it("clears the cookie the gate helper itself writes", async () => {
    await completeOnboardingGate("org-setup-done", ORG_ID, async () => null);
    const written = gateCookieName("org-setup-done", ORG_ID);
    expect(cookieNames()).toContain(written);

    clearGateCookies();

    expect(cookieNames()).not.toContain(written);
  });

  it("returns the resolved session value from refreshSessionClaims", async () => {
    const fakeSession = { expires: "2099-01-01", user: { id: "user-1" } };
    const result = await completeOnboardingGate(
      "org-setup-done",
      ORG_ID,
      async () => fakeSession,
    );
    expect(result).toBe(fakeSession);
  });

  it("hands the caller's expected claims to refreshSessionClaims", async () => {
    const refresh = jest.fn(async () => null);

    await completeOnboardingGate("org-setup-done", ORG_ID, refresh, {
      orgId: ORG_ID,
    });

    expect(refresh).toHaveBeenCalledWith({ orgId: ORG_ID });
  });

  it("asserts nothing when the scope is not an organization", async () => {
    const refresh = jest.fn(async () => null);

    await completeOnboardingGate(
      "onboarding-done",
      `${USER_ID}--${ORG_ID}`,
      refresh,
    );

    expect(refresh).toHaveBeenCalledWith(undefined);
  });

  it("returns null when refreshSessionClaims resolves null (timeout shape)", async () => {
    const result = await completeOnboardingGate(
      "org-setup-done",
      ORG_ID,
      async () => null,
    );
    expect(result).toBeNull();
  });

  it("cookie scoping still holds — only the scoped name is written", async () => {
    wipeAll();
    await completeOnboardingGate("org-setup-done", ORG_ID, async () => null);
    const scopedName = gateCookieName("org-setup-done", ORG_ID);
    expect(cookieNames()).toContain(scopedName);
    expect(cookieNames()).not.toContain("org-setup-done");
  });

  it("still expires the legacy unscoped names", () => {
    seed("org-setup-done");
    seed("onboarding-done");

    clearGateCookies();

    expect(cookieNames()).not.toContain("org-setup-done");
    expect(cookieNames()).not.toContain("onboarding-done");
  });

  it("leaves cookies that are not gate cookies alone", () => {
    seed("session-token");
    seed("org-setup-done-lookalike");
    seed(gateCookieName("onboarding-done", USER_ID));

    clearGateCookies();

    expect(cookieNames()).toContain("session-token");
    expect(cookieNames()).toContain("org-setup-done-lookalike");
  });
});
