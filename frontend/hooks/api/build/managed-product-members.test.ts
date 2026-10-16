import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import {
  useAddManagedProductMember,
  useRemoveManagedProductMember,
  useUpdateManagedProductMemberRole,
} from "./managed-product-members";

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), delete: jest.fn(), patch: jest.fn() },
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { isOrgOwner: true }, refetch: jest.fn() }),
}));

const KEY = buildWorkQueryKeys.projects.managedProducts.members(7);
const row = (id: number, role: "admin" | "member") => ({
  id,
  orgId: "o",
  managedProductId: 7,
  organizationMembershipId: id + 100,
  role,
  addedAt: "2026-10-01T00:00:00.000Z",
  member: null,
});

function setup() {
  const client = createAppQueryClient();
  client.setQueryData(KEY, { data: [row(1, "admin"), row(2, "member")], pagination: { limit: 20, hasMore: false, nextCursor: null } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const rows = () => (client.getQueryData(KEY) as { data: { id: number; role: string }[] }).data;
  return { client, wrapper, rows };
}

describe("product member cache (MP-B-025, MP-B-015)", () => {
  it("drops the removed row as soon as the delete succeeds", async () => {
    const { wrapper, rows } = setup();
    jest.mocked(apiClient.delete).mockResolvedValue(undefined);
    const { result } = renderHook(() => useRemoveManagedProductMember(7), { wrapper });
    await act(async () => { await result.current.mutateAsync(2); });
    expect(rows().map((m) => m.id)).toEqual([1]);
  });

  it("keeps the row when the delete is refused", async () => {
    const { wrapper, rows } = setup();
    jest.mocked(apiClient.delete).mockRejectedValue(new Error("409"));
    const { result } = renderHook(() => useRemoveManagedProductMember(7), { wrapper });
    await act(async () => { await result.current.mutateAsync(1).catch(() => undefined); });
    expect(rows().map((m) => m.id)).toEqual([1, 2]);
  });

  it("shows an added member at once", async () => {
    const { wrapper, rows } = setup();
    jest.mocked(apiClient.post).mockResolvedValue(row(3, "member"));
    const { result } = renderHook(() => useAddManagedProductMember(7), { wrapper });
    await act(async () => { await result.current.mutateAsync({ organizationMembershipId: 103, role: "member" }); });
    expect(rows().map((m) => m.id)).toEqual([3, 1, 2]);
  });

  it("rolls a refused role change back", async () => {
    const { wrapper, rows } = setup();
    jest.mocked(apiClient.patch).mockRejectedValue(new Error("409"));
    const { result } = renderHook(() => useUpdateManagedProductMemberRole(7), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ membershipRowId: 1, role: "member" }).catch(() => undefined);
    });
    expect(rows().find((m) => m.id === 1)?.role).toBe("admin");
  });
});
