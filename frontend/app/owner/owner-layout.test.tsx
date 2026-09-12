jest.mock("server-only", () => ({}));

jest.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT",
      redirectPath: path,
    });
  },
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(),
}));

jest.mock("@/components/wizard-shell", () => ({
  FocusedWizardFrame: () => null,
}));

import type { Session } from "next-auth";
import { cookies } from "next/headers";
import { getServerAuth } from "@/lib/get-server-auth";
import OwnerLayout from "@/app/owner/layout";

const getServerAuthMock = getServerAuth as jest.MockedFunction<
  typeof getServerAuth
>;
const cookiesMock = cookies as jest.Mock;

function operatorSession(overrides: Partial<Session> = {}): Session {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    orgId: null,
    organizationAccess: "none",
    isPlatformAdmin: true,
    user: {
      id: "operator-1",
      email: "ops@vendor.example",
      name: "Operator",
      role: "",
      isActive: true,
      isOrgOwner: false,
    },
    ...overrides,
  };
}

async function runLayout(): Promise<{ redirectedTo: string | null }> {
  try {
    await OwnerLayout({ children: null });
    return { redirectedTo: null };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "redirectPath" in error &&
      typeof error.redirectPath === "string"
    )
      return { redirectedTo: error.redirectPath };
    throw error;
  }
}

describe("/owner layout — standing comes from the allowlist, not a tenant role", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cookiesMock.mockResolvedValue({ get: () => undefined });
  });

  it("admits a platform operator", async () => {
    getServerAuthMock.mockResolvedValue(operatorSession());
    expect((await runLayout()).redirectedTo).toBeNull();
  });

  it("turns away an ordinary member even when they own an organization", async () => {
    getServerAuthMock.mockResolvedValue(
      operatorSession({
        isPlatformAdmin: false,
        orgId: "org-1",
        organizationAccess: "active",
        user: {
          id: "owner-1",
          email: "owner@tenant.example",
          name: "Owner",
          role: "OWNER",
          isActive: true,
          isOrgOwner: true,
        },
      }),
    );
    expect((await runLayout()).redirectedTo).toBe("/dashboard");
  });

  it("turns away a session with no operator claim at all", async () => {
    const { isPlatformAdmin: _omitted, ...withoutClaim } = operatorSession();
    getServerAuthMock.mockResolvedValue(withoutClaim as Session);
    expect((await runLayout()).redirectedTo).toBe("/dashboard");
  });

  it("sends a missing session to sign-in before any standing check", async () => {
    getServerAuthMock.mockResolvedValue(null);
    expect((await runLayout()).redirectedTo).toBe("/signin?session=expired");
  });

  it("sends a suspended operator to recovery rather than into platform operations", async () => {
    getServerAuthMock.mockResolvedValue(
      operatorSession({ organizationAccess: "suspended" }),
    );
    expect((await runLayout()).redirectedTo).toBe("/access-suspended");
  });

  it("keeps an operator who also belongs to an organization on the route they asked for", async () => {
    getServerAuthMock.mockResolvedValue(
      operatorSession({
        orgId: "org-1",
        organizationAccess: "active",
        userOnboardingCompletedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    expect((await runLayout()).redirectedTo).toBeNull();
  });

  it("diverts an operator who is mid-wizard to that wizard", async () => {
    getServerAuthMock.mockResolvedValue(
      operatorSession({
        orgId: "org-1",
        organizationAccess: "active",
        userOnboardingCompletedAt: null,
      }),
    );
    expect((await runLayout()).redirectedTo).toBe("/employee-onboarding");
  });
});
