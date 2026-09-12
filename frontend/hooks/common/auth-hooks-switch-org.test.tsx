import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSwitchOrg } from "./auth-hooks";

jest.mock("next-auth/react", () => ({
  getSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: jest.fn(),
  setAutoSignOutSuppressed: jest.fn(),
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("@/lib/onboarding-gate", () => ({
  clearGateCookies: jest.fn(),
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((loader: () => unknown) => loader),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({ get: jest.fn() })),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const mockUseSession = useSession as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockToastError = toast.error as jest.Mock;

let mockUpdate: jest.Mock;
let mockReplace: jest.Mock;

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
}

function makeSession(orgId: string): Session {
  return {
    user: { id: "uid", role: "MEMBER" },
    orgId,
    sessionId: `session-${orgId}`,
    expires: "2099-01-01T00:00:00.000Z",
  };
}

function flush() {
  return act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate = jest.fn();
  mockReplace = jest.fn();
  mockUseSession.mockReturnValue({
    update: mockUpdate,
    status: "authenticated",
    data: null,
  });
  mockUseRouter.mockReturnValue({
    push: jest.fn(),
    replace: mockReplace,
    refresh: jest.fn(),
  });
});

describe("I6 — useSwitchOrg switch contract and generation fencing", () => {
  it("shows error and does not navigate when refreshSessionClaims returns null", async () => {
    mockPost.mockResolvedValueOnce({ orgId: "org-b" });
    mockUpdate.mockResolvedValueOnce(null);

    const client = makeClient();
    const clearSpy = jest.spyOn(client, "clear");
    const { result } = renderHook(() => useSwitchOrg(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate("org-b");
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("could not be confirmed"),
      );
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it("shows error and does not navigate when refreshed orgId does not match mutation result", async () => {
    mockPost.mockResolvedValueOnce({ orgId: "org-b" });
    mockUpdate.mockResolvedValueOnce(makeSession("org-WRONG"));

    const client = makeClient();
    const clearSpy = jest.spyOn(client, "clear");
    const { result } = renderHook(() => useSwitchOrg(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate("org-b");
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("could not be confirmed"),
      );
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it("clears queries and navigates when refresh returns matching orgId", async () => {
    mockPost.mockResolvedValueOnce({ orgId: "org-b" });
    mockUpdate.mockResolvedValueOnce(makeSession("org-b"));

    const client = makeClient();
    const clearSpy = jest.spyOn(client, "clear");

    const { result } = renderHook(() => useSwitchOrg(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate("org-b");
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("cancels in-flight tenant reads before the switch request leaves", async () => {
    mockPost.mockResolvedValueOnce({ orgId: "org-b" });
    mockUpdate.mockResolvedValueOnce(makeSession("org-b"));

    const client = makeClient();
    const cancelSpy = jest.spyOn(client, "cancelQueries");

    const { result } = renderHook(() => useSwitchOrg(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate("org-b");
    });

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalled();
    });
    expect(cancelSpy.mock.invocationCallOrder[0]).toBeLessThan(
      mockPost.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it("shows error via onError when mutationFn rejects", async () => {
    mockPost.mockRejectedValueOnce(new Error("Not authorized"));

    const client = makeClient();
    const { result } = renderHook(() => useSwitchOrg(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate("org-b");
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("ignores a late A refresh completion when switch B has already started", async () => {
    let resolveA!: (value: Session | null) => void;
    let resolveB!: (value: Session | null) => void;

    mockPost
      .mockResolvedValueOnce({ orgId: "org-a" })
      .mockResolvedValueOnce({ orgId: "org-b" });

    mockUpdate
      .mockImplementationOnce(
        () =>
          new Promise<Session | null>((resolve) => {
            resolveA = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Session | null>((resolve) => {
            resolveB = resolve;
          }),
      );

    const client = makeClient();
    const clearSpy = jest.spyOn(client, "clear");
    const { result } = renderHook(() => useSwitchOrg(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate("org-a");
    });
    await flush();

    act(() => {
      result.current.mutate("org-b");
    });
    await flush();

    await act(async () => {
      resolveA(makeSession("org-a"));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();

    await act(async () => {
      resolveB(makeSession("org-b"));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
