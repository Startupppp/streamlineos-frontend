import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAcceptTransfer } from "./ownership";
import { SESSION_CLAIMS_UNCONFIRMED_MESSAGE } from "@/hooks/common/use-confirmed-session-claims-refresh";

const mockRefreshSessionClaims = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { permissions: [] }, refetch: jest.fn() }),
  useCan: () => true,
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), get: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((loader: () => unknown) => loader),
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useSessionClaimsRefresh: () => mockRefreshSessionClaims,
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockPost = apiClient.post as jest.Mock;
const mockToastError = toast.error as jest.Mock;

const refreshedSession: Session = {
  user: { id: "user-1", role: "MEMBER", name: "Ada" },
  orgId: "org-a",
  expires: "2099-01-01T00:00:00.000Z",
};

let client: QueryClient;

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  mockPost.mockResolvedValue({ success: true });
});

describe("accepting an ownership transfer waits for the claims that carry the new authority", () => {
  it("refreshes the claims and stays quiet when the session comes back", async () => {
    mockRefreshSessionClaims.mockResolvedValue(refreshedSession);
    const { result } = renderHook(() => useAcceptTransfer(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("transfer-1");
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("tells the new owner their session is stale when the refresh never lands", async () => {
    mockRefreshSessionClaims.mockResolvedValue(null);
    const { result } = renderHook(() => useAcceptTransfer(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("transfer-1");
    });

    expect(mockToastError).toHaveBeenCalledWith(
      SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
    );
  });

  it("does not warn about a refresh a newer acceptance already superseded", async () => {
    let settleFirst: ((session: Session | null) => void) | undefined;
    mockRefreshSessionClaims
      .mockImplementationOnce(
        () =>
          new Promise<Session | null>((resolve) => {
            settleFirst = resolve;
          }),
      )
      .mockResolvedValue(refreshedSession);

    const { result } = renderHook(() => useAcceptTransfer(), {
      wrapper: Wrapper,
    });

    let firstAccept: Promise<unknown> | undefined;
    await act(async () => {
      firstAccept = result.current.mutateAsync("transfer-1");
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.mutateAsync("transfer-2");
    });

    await act(async () => {
      settleFirst?.(null);
      await firstAccept;
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledTimes(2);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
