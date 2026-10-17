import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { useResolveDataQualityFindings } from "./data-quality-findings";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => {
  const { permissionGate } =
    jest.requireActual<typeof import("@/lib/rbac/permission-gate")>("@/lib/rbac/permission-gate");
  return {
    usePermissionGate: (permission: PermissionKey) => permissionGate(permission, true, true),
    useCan: () => true,
    useAccess: () => ({ data: { scopes: {}, isOrgOwner: true }, refetch: jest.fn() }),
  };
});

const post = jest.mocked(apiClient.post);

function row(findingId: string) {
  return { findingId, status: "open", proposedAction: "none" };
}

describe("useResolveDataQualityFindings", () => {
  it("sends an ids selection and drops only the findings that closed from cached pages", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const key = growthAndSignQueryKeys.crmDataQuality.findings({ status: "open", limit: 25 });
    client.setQueryData(key, { data: [row("a"), row("b"), row("c")], pagination: { limit: 25, hasMore: false, nextCursor: null } });
    post.mockResolvedValueOnce({
      resolutionId: "r1",
      action: "dismiss",
      reversibility: "instant",
      attemptedCount: 2,
      resolvedCount: 1,
      failedCount: 1,
      failures: [{ findingId: "b", error: "claimed elsewhere" }],
      remainingInGroup: null,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useResolveDataQualityFindings(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ findingIds: ["a", "b"], action: "dismiss" });
    });

    expect(post).toHaveBeenCalledWith(
      "/crm/data-quality/resolve",
      { selection: { kind: "ids", findingIds: ["a", "b"] }, action: "dismiss", expectedCount: 2 },
      undefined,
      expect.anything(),
    );
    const page = client.getQueryData<{ data: Array<{ findingId: string }> }>(key);
    expect(page?.data.map((f) => f.findingId)).toEqual(["b", "c"]);
  });
});
