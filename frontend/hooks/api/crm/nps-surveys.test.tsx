import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { NpsSurvey } from "./nps-surveys-schema";
import { useDeleteNpsSurvey, useUpdateNpsSurvey } from "./nps-surveys";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
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

const keys = knowledgeAndSurveysQueryKeys.nps;

function survey(id: number, status = "draft"): NpsSurvey {
  return {
    id,
    orgId: "org",
    title: `Survey ${id}`,
    question: "Recommend us?",
    status,
    publicToken: `tok-${id}`,
    createdBy: null,
    createdByMembershipId: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    responseCount: 4,
    promoters: 2,
    passives: 1,
    detractors: 1,
    nps: 25,
  };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(keys.list(), [survey(1), survey(2)]);
  client.setQueryData(keys.stats(), { activeSurveys: 0 });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("NPS survey mutations patch the cache", () => {
  it("activating keeps the row's tallies, swaps in the server row and only marks stats stale", async () => {
    const { client, wrapper } = setup();
    const { responseCount: _r, promoters: _p, passives: _pa, detractors: _d, nps: _n, ...bare } = survey(1, "active");
    jest.mocked(apiClient.patch).mockResolvedValueOnce({ ...bare, updatedAt: "2026-10-02T00:00:00.000Z" });
    const { result } = renderHook(() => useUpdateNpsSurvey(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ surveyId: 1, status: "active" });
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/customer-executive/nps/1",
      { status: "active" },
      undefined,
      expect.anything(),
    );
    const [first] = client.getQueryData<NpsSurvey[]>(keys.list()) ?? [];
    expect(first).toMatchObject({ status: "active", responseCount: 4, nps: 25, updatedAt: "2026-10-02T00:00:00.000Z" });
    expect(client.getQueryState(keys.stats())?.isInvalidated).toBe(true);
    expect(client.getQueryState(keys.list())?.isInvalidated).toBe(false);
  });

  it("deleting drops only that row", async () => {
    const { client, wrapper } = setup();
    jest.mocked(apiClient.delete).mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useDeleteNpsSurvey(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(client.getQueryData<NpsSurvey[]>(keys.list())?.map((row) => row.id)).toEqual([2]);
    expect(client.getQueryState(keys.stats())?.isInvalidated).toBe(true);
  });
});
