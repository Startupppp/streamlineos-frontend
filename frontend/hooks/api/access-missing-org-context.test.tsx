import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/api-client";
import { usePermissionGate } from "./access";

const session: { data: { orgId?: string; user: { id: string } } | null; status: string } = {
  data: null,
  status: "loading",
};

jest.mock("next-auth/react", () => ({ useSession: () => session }));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("access when the session has no organization", () => {
  it("resolves gated reads to unavailable instead of pending for ever", async () => {
    session.data = { user: { id: "user-1" } };
    session.status = "authenticated";

    const { result } = renderHook(() => usePermissionGate("directory:people:view"), { wrapper });

    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(result.current.pending).toBe(false);
    expect(result.current.allowed).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("keeps a session that is still landing pending, without a request", () => {
    session.data = null;
    session.status = "loading";

    const { result } = renderHook(() => usePermissionGate("directory:people:view"), { wrapper });

    expect(result.current.pending).toBe(true);
    expect(result.current.unavailable).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
