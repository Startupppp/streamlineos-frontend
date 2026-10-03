import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCanState, usePermissionGate } from "./access";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } }, status: "authenticated" }),
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("access read disabled by a session with no organization", () => {
  it("useCanState settles to denied instead of loading for ever", () => {
    const { result } = renderHook(() => useCanState("hr:employees:view"), { wrapper });
    expect(result.current).toBe("denied");
  });

  it("usePermissionGate settles to denied instead of pending", () => {
    const { result } = renderHook(() => usePermissionGate("hr:employees:view"), { wrapper });
    expect(result.current.pending).toBe(false);
    expect(result.current.denied).toBe(true);
  });
});
