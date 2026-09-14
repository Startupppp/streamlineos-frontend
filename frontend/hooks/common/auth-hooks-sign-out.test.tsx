import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { clearGateCookies } from "@/lib/onboarding-gate";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSignOut } from "./auth-hooks";

jest.mock("next-auth/react", () => ({
  getSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(() => ({
    update: jest.fn(),
    status: "authenticated",
    data: null,
  })),
}));

jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: jest.fn(),
  clearImpersonation: jest.fn(),
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

const mockPost = apiClient.post as jest.Mock;
const mockClearBackendTokenCache = clearBackendTokenCache as jest.Mock;
const mockClearGateCookies = clearGateCookies as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockToastError = toast.error as jest.Mock;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

let mockRouterPush: jest.Mock;

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });
}

describe("Logout gap — useSignOut distinguishes local from server revocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush = jest.fn();
    mockUseRouter.mockReturnValue({
      push: mockRouterPush,
      replace: jest.fn(),
      refresh: jest.fn(),
    });
    mockSignOut.mockResolvedValue({ url: "/signin" });
  });

  it("navigates to /signin and does not show error toast when server logout succeeds", async () => {
    mockPost.mockResolvedValueOnce({ success: true });

    const client = makeClient();
    const { result } = renderHook(() => useSignOut(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/signin");
    });

    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockClearBackendTokenCache).toHaveBeenCalled();
    expect(mockClearGateCookies).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(result.current.data).toEqual({
      localSignOutCompleted: true,
      serverRevocationCompleted: true,
    });
  });

  it("still signs out locally, routes to /signin and reports the failed revocation on a backend 5xx", async () => {
    const serverError = Object.assign(new Error("Internal Server Error"), {
      status: 500,
    });
    mockPost.mockRejectedValueOnce(serverError);

    const client = makeClient();
    const { result } = renderHook(() => useSignOut(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/signin");
    });

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("Server session could not be revoked"),
    );
    expect(mockClearBackendTokenCache).toHaveBeenCalled();
    expect(mockClearGateCookies).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(result.current.data).toEqual({
      localSignOutCompleted: true,
      serverRevocationCompleted: false,
    });
  });

  it("still signs out locally and reports the failed revocation when the backend is unreachable", async () => {
    mockPost.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const client = makeClient();
    const { result } = renderHook(() => useSignOut(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/signin");
    });

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("Server session could not be revoked"),
    );
    expect(mockClearBackendTokenCache).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(result.current.data?.serverRevocationCompleted).toBe(false);
  });

  it("clears the local query cache on every sign-out path", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network error"));

    const client = makeClient();
    const clearSpy = jest.spyOn(client, "clear");

    const { result } = renderHook(() => useSignOut(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/signin");
    });

    expect(clearSpy).toHaveBeenCalled();
  });

  it("never promises global or all-device revocation when the backend call failed", async () => {
    mockPost.mockRejectedValueOnce(new Error("Timeout"));

    const client = makeClient();
    const { result } = renderHook(() => useSignOut(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });

    const [message] = mockToastError.mock.calls[0] as [string];
    expect(message).not.toMatch(/signed out everywhere/i);
    expect(message).not.toMatch(/all devices/i);
    expect(message).toMatch(/other devices may still be signed in/i);
  });
});
