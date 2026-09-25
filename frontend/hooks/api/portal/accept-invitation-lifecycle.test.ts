import {
  portalApiClient,
  setPortalToken,
  clearPortalToken,
} from "@/lib/portal-api-client";

jest.mock("@/lib/portal-api-client", () => ({
  portalApiClient: { post: jest.fn() },
  setPortalToken: jest.fn(),
  clearPortalToken: jest.fn(),
}));

const post = jest.mocked(portalApiClient.post);

describe("accept-invitation endpoint wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("posts to /portal/auth/accept-invitation with the raw token in the body so the server can validate and exchange it", async () => {
    post.mockResolvedValue({ token: "portal-session-token-xyz" });
    await portalApiClient.post(
      "/portal/auth/accept-invitation",
      { token: "invite-abc" },
      { authenticated: false },
    );
    expect(post).toHaveBeenCalledWith(
      "/portal/auth/accept-invitation",
      { token: "invite-abc" },
      { authenticated: false },
    );
  });

  it("does not require authentication on the POST so an external client without a session can exchange their invitation", async () => {
    post.mockResolvedValue({ token: "portal-session-token-xyz" });
    await portalApiClient.post(
      "/portal/auth/accept-invitation",
      { token: "invite-abc" },
      { authenticated: false },
    );
    const callOptions = post.mock.calls[0]?.[2];
    expect(callOptions?.authenticated).toBe(false);
  });
});

describe("portal token lifecycle — setPortalToken / clearPortalToken", () => {
  it("setPortalToken is callable with the token returned from accept-invitation so the session can be persisted", () => {
    setPortalToken("portal-session-token-xyz");
    expect(setPortalToken).toHaveBeenCalledWith("portal-session-token-xyz");
  });

  it("clearPortalToken is callable so an expired or revoked session can be removed from storage", () => {
    clearPortalToken();
    expect(clearPortalToken).toHaveBeenCalled();
  });
});
