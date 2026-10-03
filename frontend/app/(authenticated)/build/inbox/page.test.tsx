const mockEnforceRouteAccess = jest.fn();
const mockRedirect = jest.fn((href: string) => {
  throw new Error(`redirect:${href}`);
});

jest.mock("@/lib/rbac/route-access/enforce-route-access", () => ({
  enforceRouteAccess: (...args: unknown[]) => mockEnforceRouteAccess(...args),
}));

jest.mock("next/navigation", () => ({
  redirect: (href: string) => mockRedirect(href),
}));

jest.mock("@/features/build/inbox/inbox-page", () => ({
  InboxPage: () => null,
}));

import BuildInboxRoute from "./page";

beforeEach(() => {
  jest.clearAllMocks();
  mockEnforceRouteAccess.mockResolvedValue(undefined);
});

describe("Build Inbox legacy drafts links", () => {
  it("authorizes before redirecting a draft link to My Work and preserves safe search state", async () => {
    await expect(
      BuildInboxRoute({
        searchParams: Promise.resolve({ view: "drafts", q: "release plan", projectId: "42" }),
      }),
    ).rejects.toThrow("redirect:/build/my-work?section=drafts&q=release+plan&projectId=42");

    expect(mockEnforceRouteAccess).toHaveBeenCalledWith("/build/inbox");
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });

  it("drops notification-only and unsafe query fields from the draft redirect", async () => {
    await expect(
      BuildInboxRoute({
        searchParams: Promise.resolve({
          view: "drafts",
          section: "MENTIONS",
          cursor: "999",
          projectId: "-2",
          returnTo: "//outside.example",
          q: ["duplicate", "value"],
        }),
      }),
    ).rejects.toThrow("redirect:/build/my-work?section=drafts");

    expect(mockRedirect).toHaveBeenCalledWith("/build/my-work?section=drafts");
  });

  it("keeps notification URLs on Inbox", async () => {
    const page = await BuildInboxRoute({
      searchParams: Promise.resolve({ section: "MENTIONS" }),
    });

    expect(page).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does not redirect before route access succeeds", async () => {
    mockEnforceRouteAccess.mockRejectedValueOnce(new Error("denied"));

    await expect(
      BuildInboxRoute({ searchParams: Promise.resolve({ view: "drafts" }) }),
    ).rejects.toThrow("denied");
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
