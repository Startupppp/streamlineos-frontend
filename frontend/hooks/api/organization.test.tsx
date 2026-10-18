import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { OrgSettings } from "@/types/organization";
import { useDeleteOrg, useUpdateOrgSettings } from "./organization";
import { useBulkDeleteLeads } from "./leads";
import { useCreateOrgCostCenter, useCreateOrgDepartment, useUpdateOrgCostCenter, useUpdateOrgDepartment } from "./org-hierarchy";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    delete: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
  setAutoSignOutSuppressed: jest.fn(),
}));

const mockedDelete = apiClient.delete as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("organization mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDelete.mockResolvedValue({ success: true, nextOrgId: null });
  });

  it("sends delete confirmation as the top-level request body", async () => {
    const { result } = renderHook(() => useDeleteOrg(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ confirmation: "Acme" });
    });

    expect(mockedDelete).toHaveBeenCalledWith(
      "/organization",
      { confirmation: "Acme" },
      undefined,
      expect.any(Function),
    );
  });

  it("sends bulk lead deletion input as the top-level request body", async () => {
    const { result } = renderHook(() => useBulkDeleteLeads(), { wrapper });
    const input = { leadIds: [1, 2] };

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(mockedDelete).toHaveBeenCalledWith(
      "/leads/bulk",
      input,
      undefined,
      expect.any(Function),
    );
  });

  it("ORG-B-014: settles the settings save on the PATCH response with the cache patched, not after the slow refetch", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ success: true });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const key = platformCoreQueryKeys.organization.settings();
    const stored: Partial<OrgSettings> = { id: "org-1", name: "Old name", industry: "Retail" };
    client.setQueryData(key, stored);
    const invalidate = jest
      .spyOn(client, "invalidateQueries")
      .mockImplementation(() => new Promise<void>(() => undefined));
    function sharedWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(() => useUpdateOrgSettings(), { wrapper: sharedWrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "New name", website: undefined });
    });

    expect(invalidate).toHaveBeenCalled();
    expect(client.getQueryData<OrgSettings>(key)).toMatchObject({ name: "New name", industry: "Retail" });
  });

  it("ORG-B-014: settles a hierarchy create on the POST response instead of waiting for every hierarchy list to refetch", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ id: "cc-1", name: "Ops", code: "OPS" });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = jest
      .spyOn(client, "invalidateQueries")
      .mockImplementation(() => new Promise<void>(() => undefined));
    function sharedWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(() => useCreateOrgCostCenter(), { wrapper: sharedWrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "Ops", code: "OPS" });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: platformHierarchyQueryKeys.hierarchy.all });
  });
  it("ORG-B-013: hierarchy create and update mutations leave error reporting to their form, so a duplicate code never also raises a raw 'code:' toast", async () => {
    (apiClient.post as jest.Mock).mockRejectedValue(new Error("conflict"));
    (apiClient.patch as jest.Mock).mockRejectedValue(new Error("conflict"));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    function sharedWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    const createCostCenter = renderHook(() => useCreateOrgCostCenter(), { wrapper: sharedWrapper });
    const updateCostCenter = renderHook(() => useUpdateOrgCostCenter(), { wrapper: sharedWrapper });
    const createDepartment = renderHook(() => useCreateOrgDepartment(), { wrapper: sharedWrapper });
    const updateDepartment = renderHook(() => useUpdateOrgDepartment(), { wrapper: sharedWrapper });

    await act(async () => {
      await createCostCenter.result.current.mutateAsync({ name: "Ops", code: "OPS" }).catch(() => undefined);
      await updateCostCenter.result.current.mutateAsync({ id: "cc-1", code: "OPS" }).catch(() => undefined);
      await createDepartment.result.current.mutateAsync({ name: "Ops", code: "OPS" }).catch(() => undefined);
      await updateDepartment.result.current.mutateAsync({ departmentId: "d-1", code: "OPS" }).catch(() => undefined);
    });

    const mutations = client.getMutationCache().getAll();
    expect(mutations).toHaveLength(4);
    for (const mutation of mutations) {
      expect(mutation.options.meta).toEqual(expect.objectContaining({ errorToast: false }));
    }
  });
});
