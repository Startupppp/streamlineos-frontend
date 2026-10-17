import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";
import { useAccess, usePermissionGate } from "./access";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } }, status: "authenticated" }),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(() => Promise.reject(new ApiError("Service Unavailable", 503, "SERVICE_UNAVAILABLE"))) },
}));

// Same default the app's provider installs: a failed read with no data throws.
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, throwOnError: readErrorReachesBoundary } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useAccess on a failed /me/access (BUG-HRMS-014)", () => {
  it("reports the failure inline instead of throwing to the root boundary", async () => {
    const { result } = renderHook(() => useAccess(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it("resolves every permission gate to unavailable rather than pending", async () => {
    const { result } = renderHook(() => usePermissionGate("directory:people:view"), { wrapper });

    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(result.current.pending).toBe(false);
    expect(result.current.allowed).toBe(false);
  });
});
