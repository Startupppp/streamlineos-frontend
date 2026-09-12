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
  headers: jest.fn(),
}));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(),
}));

jest.mock("@/lib/rbac/get-server-access", () => ({
  getServerAccess: jest.fn(),
}));

jest.mock("@/lib/prefetch/access", () => ({
  prefetchAccess: jest.fn(),
}));

jest.mock("@/app/(authenticated)/layout-client", () => ({
  LayoutClient: () => null,
}));

jest.mock("@/features/build/tickets/global-create-ticket-dialog", () => ({
  GlobalCreateTicketDialog: () => null,
}));

jest.mock("@/components/theme/app-theme-script", () => ({
  AppThemeScript: () => null,
}));

jest.mock("@/components/theme/app-theme-provider", () => ({
  AppThemeProvider: () => null,
}));

jest.mock("@/components/feedbucket/feedbucket-embed", () => ({
  FeedbucketEmbed: () => null,
}));

import type { Session } from "next-auth";
import { cookies, headers } from "next/headers";
import { getServerAuth } from "@/lib/get-server-auth";
import { getServerAccess } from "@/lib/rbac/get-server-access";
import { prefetchAccess } from "@/lib/prefetch/access";
import { gateCookieName } from "@/lib/onboarding-gate";
import DashboardLayout from "@/app/(authenticated)/layout";

const getServerAuthMock = getServerAuth as jest.MockedFunction<
  typeof getServerAuth
>;
const getServerAccessMock = getServerAccess as jest.Mock;
const prefetchAccessMock = prefetchAccess as jest.Mock;
const cookiesMock = cookies as jest.Mock;
const headersMock = headers as jest.Mock;

interface GateAttempt {
  redirectedTo: string | null;
}

function activeSession(overrides: Partial<Session> = {}): Session {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    orgId: "org-1",
    organizationAccess: "active",
    userOnboardingCompletedAt: "2026-01-01T00:00:00.000Z",
    user: {
      id: "user-1",
      email: "member@example.com",
      name: "Member",
      role: "MEMBER",
      isActive: true,
      isOrgOwner: false,
    },
    ...overrides,
  };
}

function setCookies(names: string[]): void {
  cookiesMock.mockResolvedValue({
    get: (name: string) =>
      names.includes(name) ? { value: "1" } : undefined,
  });
}

function setPath(pathname: string): void {
  headersMock.mockResolvedValue(
    new Headers({ "x-pathname": pathname, "user-agent": "jest" }),
  );
}

async function runLayout(): Promise<GateAttempt> {
  try {
    await DashboardLayout({ children: null });
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

describe("(authenticated) layout — session gate routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCookies([]);
    setPath("/dashboard");
    getServerAccessMock.mockResolvedValue({ mfa: null });
    prefetchAccessMock.mockResolvedValue({ queries: [], mutations: [] });
  });

  it("routes a missing session to sign-in", async () => {
    getServerAuthMock.mockResolvedValue(null);
    const result = await runLayout();
    expect(result.redirectedTo).toBe("/signin?session=expired");
  });

  it("routes a deactivated account to sign-in", async () => {
    getServerAuthMock.mockResolvedValue(
      activeSession({
        user: {
          id: "user-1",
          email: "member@example.com",
          name: "Member",
          role: "MEMBER",
          isActive: false,
          isOrgOwner: false,
        },
      }),
    );
    const result = await runLayout();
    expect(result.redirectedTo).toBe("/signin?session=expired");
  });

  it("routes a suspended membership to access-suspended, not organization setup", async () => {
    getServerAuthMock.mockResolvedValue(
      activeSession({
        organizationAccess: "suspended",
        suspendedOrganizationName: "Acme",
      }),
    );
    const result = await runLayout();
    expect(result.redirectedTo).toBe("/access-suspended");
  });

  it("routes an account with no organization to organization setup", async () => {
    getServerAuthMock.mockResolvedValue(
      activeSession({ orgId: null, organizationAccess: "none" }),
    );
    const result = await runLayout();
    expect(result.redirectedTo).toBe("/org-setup");
  });

  it("routes an owner with unfinished organization onboarding to the organization gate", async () => {
    getServerAuthMock.mockResolvedValue(
      activeSession({
        orgOnboardingCompletedAt: null,
        user: {
          id: "owner-1",
          email: "owner@example.com",
          name: "Owner",
          role: "OWNER",
          isActive: true,
          isOrgOwner: true,
        },
      }),
    );
    const result = await runLayout();
    expect(result.redirectedTo).toBe("/org-setup");
  });

  it("admits an owner whose organization onboarding is stamped", async () => {
    getServerAuthMock.mockResolvedValue(
      activeSession({
        orgOnboardingCompletedAt: "2026-01-01T00:00:00.000Z",
        user: {
          id: "owner-1",
          email: "owner@example.com",
          name: "Owner",
          role: "OWNER",
          isActive: true,
          isOrgOwner: true,
        },
      }),
    );
    const result = await runLayout();
    expect(result.redirectedTo).toBeNull();
  });

  it("routes an employee with unfinished onboarding to the employee gate", async () => {
    getServerAuthMock.mockResolvedValue(
      activeSession({ userOnboardingCompletedAt: null }),
    );
    const result = await runLayout();
    expect(result.redirectedTo).toBe("/employee-onboarding");
  });

  it("admits an employee whose skip is recorded only in the gate cookie", async () => {
    getServerAuthMock.mockResolvedValue(
      activeSession({ userOnboardingCompletedAt: null }),
    );
    setCookies([gateCookieName("onboarding-done", "user-1--org-1")]);
    const result = await runLayout();
    expect(result.redirectedTo).toBeNull();
  });

  it("never admits an employee on another organization's gate cookie", async () => {
    getServerAuthMock.mockResolvedValue(
      activeSession({ orgId: "org-2", userOnboardingCompletedAt: null }),
    );
    setCookies([gateCookieName("onboarding-done", "user-1--org-1")]);
    const result = await runLayout();
    expect(result.redirectedTo).toBe("/employee-onboarding");
  });

  it("does not read access or prefetch tenant data when a wizard gate fires", async () => {
    getServerAuthMock.mockResolvedValue(
      activeSession({ orgId: null, organizationAccess: "none" }),
    );
    const result = await runLayout();
    expect(result.redirectedTo).toBe("/org-setup");
    expect(getServerAccessMock).not.toHaveBeenCalled();
    expect(prefetchAccessMock).not.toHaveBeenCalled();
  });

  it("routes an unsatisfied enforced MFA to settings", async () => {
    getServerAuthMock.mockResolvedValue(activeSession());
    getServerAccessMock.mockResolvedValue({
      mfa: { enforced: true, satisfied: false },
    });
    const result = await runLayout();
    expect(result.redirectedTo).toBe("/settings");
  });

  it("lets an unsatisfied enforced MFA reach settings itself", async () => {
    getServerAuthMock.mockResolvedValue(activeSession());
    getServerAccessMock.mockResolvedValue({
      mfa: { enforced: true, satisfied: false },
    });
    setPath("/settings/security");
    const result = await runLayout();
    expect(result.redirectedTo).toBeNull();
    expect(prefetchAccessMock).toHaveBeenCalledTimes(1);
  });

  it("admits an active member with satisfied MFA", async () => {
    getServerAuthMock.mockResolvedValue(activeSession());
    getServerAccessMock.mockResolvedValue({
      mfa: { enforced: true, satisfied: true },
    });
    const result = await runLayout();
    expect(result.redirectedTo).toBeNull();
    expect(prefetchAccessMock).toHaveBeenCalledTimes(1);
  });
});
