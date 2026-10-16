import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAddBuildMember, useRemoveBuildMember, type BuildMembersResponse } from "./build-members";

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), delete: jest.fn(), get: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: {} }, refetch: jest.fn() }),
}));

const member = (id: string) => ({
  id, membershipId: 1, role: "member", addedAt: "2026-10-01T00:00:00Z", name: id,
  firstName: null, lastName: null, email: `${id}@x.test`, image: null, teams: [],
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = buildWorkQueryKeys.projects.buildMembers.list({ limit: 25 });
  const page: BuildMembersResponse = {
    data: [member("u1"), member("u2")],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  };
  client.setQueryData(key, page);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, key, wrapper };
}

describe("Build workspace member cache (RBAC-B-006: added member hidden until reload)", () => {
  it("does not settle the add until the members list has been refreshed", async () => {
    const { client, wrapper } = setup();
    (apiClient.post as jest.Mock).mockResolvedValue({});
    let refreshed = false;
    jest.spyOn(client, "invalidateQueries").mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      refreshed = true;
    });
    const { result } = renderHook(() => useAddBuildMember(), { wrapper });
    await act(() => result.current.mutateAsync({ userId: "u3" }));
    expect(refreshed).toBe(true);
  });

  it("drops a removed member from the cached list at once", async () => {
    const { client, key, wrapper } = setup();
    (apiClient.delete as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useRemoveBuildMember(), { wrapper });
    await act(() => result.current.mutateAsync("u1"));
    expect(client.getQueryData<BuildMembersResponse>(key)?.data.map((m) => m.id)).toEqual(["u2"]);
  });
});
