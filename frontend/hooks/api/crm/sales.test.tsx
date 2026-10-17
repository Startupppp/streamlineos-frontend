import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { useRemovePlaybookEntry, useSalesRepComparison, useSavePlaybookEntry } from "./sales";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
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

const entry = (id: number, sortOrder: number, title = `Play ${id}`) => ({
  id,
  orgId: "o",
  category: null,
  title,
  content: "",
  sortOrder,
  createdBy: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("sales hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(apiClient.get).mockResolvedValue({});
  });

  it("does not ask for a rep comparison until two different reps are picked", () => {
    const { wrapper } = setup();
    renderHook(() => useSalesRepComparison(1, null, {}), { wrapper });
    renderHook(() => useSalesRepComparison(2, 2, {}), { wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();

    renderHook(() => useSalesRepComparison(1, 2, { from: "2026-01-01" }), { wrapper });
    expect(apiClient.get).toHaveBeenCalledWith(
      "/sales/dashboard/rep-comparison",
      { rep1: "1", rep2: "2", from: "2026-01-01" },
      expect.anything(),
      expect.anything(),
    );
  });

  it("patches a saved play into the cached playbook in order, and drops a removed one", async () => {
    const { client, wrapper } = setup();
    const key = accessAndCrmQueryKeys.sales.playbook();
    client.setQueryData(key, [entry(1, 0), entry(2, 2)]);
    jest.mocked(apiClient.patch).mockResolvedValueOnce(entry(2, 0, "Renamed"));
    jest.mocked(apiClient.delete).mockResolvedValueOnce({ success: true });

    const save = renderHook(() => useSavePlaybookEntry(), { wrapper });
    await act(async () => {
      await save.result.current.mutateAsync({ entryId: 2, title: "Renamed" });
    });
    expect(client.getQueryData<Array<{ id: number; title: string }>>(key)?.map((e) => e.title)).toEqual([
      "Play 1",
      "Renamed",
    ]);

    const remove = renderHook(() => useRemovePlaybookEntry(), { wrapper });
    await act(async () => {
      await remove.result.current.mutateAsync(1);
    });
    expect(client.getQueryData<Array<{ id: number }>>(key)?.map((e) => e.id)).toEqual([2]);
  });
});
