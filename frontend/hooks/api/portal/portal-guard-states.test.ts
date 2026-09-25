import { renderHook } from "@testing-library/react";
import { usePortalGuard } from "./use-portal-guard";
import { setPortalToken, clearPortalToken } from "@/lib/portal-api-client";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  clearPortalToken();
});

afterEach(() => {
  clearPortalToken();
});

describe("usePortalGuard — unauthenticated / missing token", () => {
  it("redirects to /accept-invitation?reason=no_token when no portal token is present so an external client without a session is sent to the invitation flow, not the internal signin", () => {
    renderHook(() => usePortalGuard());
    expect(mockReplace).toHaveBeenCalledWith("/accept-invitation?reason=no_token");
  });

  it("returns isReady=false when no portal token is present so portal pages can show a skeleton before confirming the session is absent", () => {
    const { result } = renderHook(() => usePortalGuard());
    expect(result.current.isReady).toBe(false);
  });

  it("ANTI-VACUITY: redirect target starts with /accept-invitation not /portal/accept-invitation so the client is not dumped on the authenticated staff layout", () => {
    renderHook(() => usePortalGuard());
    const target = mockReplace.mock.calls[0]?.[0] as string | undefined;
    expect(target).toBeDefined();
    expect(target!.startsWith("/portal/")).toBe(false);
    expect(target!.startsWith("/accept-invitation")).toBe(true);
  });
});

describe("usePortalGuard — valid token", () => {
  it("returns isReady=true when a portal token is present so the page proceeds to fetch its data", () => {
    setPortalToken("valid-portal-token");
    const { result } = renderHook(() => usePortalGuard());
    expect(result.current.isReady).toBe(true);
  });

  it("does not redirect when a portal token is present so the portal page is not immediately bounced", () => {
    setPortalToken("valid-portal-token");
    renderHook(() => usePortalGuard());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
