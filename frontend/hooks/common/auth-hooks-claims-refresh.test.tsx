import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import type { Session } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { clearBackendTokenCache } from "@/lib/api-client";
import { toast } from "sonner";
import { useGoogleSignIn, useSessionClaimsRefresh } from "./auth-hooks";

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

jest.mock("@/lib/onboarding-gate", () => ({ clearGateCookies: jest.fn() }));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((loader: () => unknown) => loader),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() })),
  useSearchParams: jest.fn(() => ({ get: jest.fn() })),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockUseSession = useSession as jest.Mock;
const mockSignIn = signIn as jest.Mock;
const mockClearTokenCache = clearBackendTokenCache as jest.Mock;
const mockToastError = toast.error as jest.Mock;

let mockUpdate: jest.Mock;

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function makeSession(orgId: string): Session {
  return {
    user: { id: "uid", role: "MEMBER" },
    orgId,
    expires: "2099-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate = jest.fn();
  mockUseSession.mockReturnValue({ update: mockUpdate, status: "authenticated", data: null });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useSessionClaimsRefresh — what the caller is promised", () => {
  it("drops the cached backend token before asking NextAuth for fresh claims", async () => {
    mockUpdate.mockResolvedValue(makeSession("org-1"));
    const { result } = renderHook(() => useSessionClaimsRefresh(), { wrapper: Wrapper });

    let resolved: Session | null = null;
    await act(async () => {
      resolved = await result.current({ orgId: "org-1" });
    });

    expect(mockClearTokenCache).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ orgId: "org-1" });
    expect(resolved).toEqual(makeSession("org-1"));
  });

  it("resolves null rather than rejecting when the update fails", async () => {
    mockUpdate.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useSessionClaimsRefresh(), { wrapper: Wrapper });

    let resolved: Session | null | undefined;
    await act(async () => {
      resolved = await result.current();
    });

    expect(resolved).toBeNull();
  });

  it("PINNED: an update that never settles resolves null at 18s, and is NOT cancelled", async () => {
    // The timeout bounds the CALLER, not the work. `update()` keeps running and
    // still writes the NextAuth session when it eventually lands, which is why
    // every consumer needs its own generation fence — `useSwitchOrg` has one and
    // the other thirteen call sites do not (recorded in the identity PRD).
    jest.useFakeTimers();
    let settleUpdate: (session: Session) => void = () => undefined;
    mockUpdate.mockReturnValue(
      new Promise<Session>((resolve) => {
        settleUpdate = resolve;
      }),
    );
    const { result } = renderHook(() => useSessionClaimsRefresh(), { wrapper: Wrapper });

    const pending = result.current({ orgId: "org-late" });
    const observed: Array<Session | null> = [];
    void pending.then((value) => observed.push(value));

    await act(async () => {
      jest.advanceTimersByTime(17_999);
      await Promise.resolve();
    });
    expect(observed).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(observed).toEqual([null]);

    // The late completion arrives after the caller has already been told null.
    await act(async () => {
      settleUpdate(makeSession("org-late"));
      await Promise.resolve();
    });
    expect(observed).toEqual([null]);
    await expect(pending).resolves.toBeNull();
  });
});

describe("useGoogleSignIn", () => {
  it("hands NextAuth the callback url the caller computed", async () => {
    mockSignIn.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGoogleSignIn(() => "/dashboard?from=signin"), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/dashboard?from=signin",
    });
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("surfaces a provider failure as an error toast instead of a silent no-op", async () => {
    mockSignIn.mockRejectedValue(new Error("OAuthSignin"));
    const { result } = renderHook(() => useGoogleSignIn(() => "/dashboard"), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Google sign-in failed. Please try again.",
    );
  });
});
