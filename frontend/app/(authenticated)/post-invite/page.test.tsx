const mockSession = jest.fn();
const mockAccess = jest.fn();
const mockWizardGate = jest.fn();
const mockCookies = jest.fn();
const mockRedirect = jest.fn((destination: string): never => {
  throw new Error(`NEXT_REDIRECT:${destination}`);
});

jest.mock("server-only", () => ({}));
jest.mock("next/headers", () => ({ cookies: () => mockCookies() }));
jest.mock("next/navigation", () => ({ redirect: (destination: string) => mockRedirect(destination) }));
jest.mock("@/lib/rbac/require-permission", () => ({
  requireSession: () => mockSession(),
  AccessUnavailableError: class extends Error {},
}));
jest.mock("@/lib/rbac/get-server-access", () => ({
  getServerAccessResult: () => mockAccess(),
}));
jest.mock("@/lib/wizard-gate", () => ({
  resolveWizardGate: (...args: unknown[]) => mockWizardGate(...args),
}));
import PostInvitePage from "./page";

function destinationOf(element: unknown): string {
  return (element as { props: { destination: string } }).props.destination;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue({ orgId: "invited-org", user: { id: "invitee" } });
  mockCookies.mockResolvedValue({ get: () => undefined });
  mockWizardGate.mockReturnValue(null);
  mockAccess.mockResolvedValue({
    ok: true,
    access: {
      scopes: { "build:view": "own" },
      isOrgOwner: false,
      canManageOrganizationMembership: false,
      modules: { build: true },
    },
  });
});

describe("post-invite destination", () => {
  it("loads effective access for the signed-in invited organization and renders the Build transition", async () => {
    const result = await PostInvitePage();
    expect(destinationOf(result)).toBe("/build");
    expect(mockSession).toHaveBeenCalledTimes(1);
    expect(mockAccess).toHaveBeenCalledTimes(1);
    expect(mockWizardGate).toHaveBeenCalledTimes(1);
  });

  it("falls back to the dashboard for a member without Build standing", async () => {
    mockAccess.mockResolvedValue({
      ok: true,
      access: {
        scopes: {},
        isOrgOwner: false,
        canManageOrganizationMembership: false,
        modules: { build: true },
      },
    });

    const result = await PostInvitePage();
    expect(destinationOf(result)).toBe("/dashboard");
  });

  it("uses the existing HR wizard gate when HR permission is effective", async () => {
    mockWizardGate.mockReturnValue("/employee-onboarding");
    mockAccess.mockResolvedValue({
      ok: true,
      access: {
        scopes: { "hr:access:view": "all", "build:view": "all" },
        isOrgOwner: false,
        canManageOrganizationMembership: false,
        modules: { hr: true, build: true },
      },
    });

    const result = await PostInvitePage();
    expect(destinationOf(result)).toBe("/employee-onboarding");
  });

  it("resolves unfinished organization setup before reading effective module access", async () => {
    mockWizardGate.mockReturnValue("/org-setup");
    mockAccess.mockResolvedValue({ ok: false, error: new Error("no organization access") });

    await expect(PostInvitePage()).rejects.toThrow("NEXT_REDIRECT:/org-setup");
    expect(mockAccess).not.toHaveBeenCalled();
  });

  it("does not mistake enabled HR for HR access", async () => {
    mockWizardGate.mockReturnValue("/employee-onboarding");
    mockAccess.mockResolvedValue({
      ok: true,
      access: {
        scopes: { "build:view": "all" },
        isOrgOwner: false,
        canManageOrganizationMembership: false,
        modules: { hr: true, build: true },
      },
    });

    const result = await PostInvitePage();
    expect(destinationOf(result)).toBe("/build");
  });

  it("shows a retryable error boundary instead of inventing a landing when access cannot be read", async () => {
    mockAccess.mockResolvedValue({ ok: false, error: new Error("access unavailable") });

    await expect(PostInvitePage()).rejects.toBeInstanceOf(Error);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
