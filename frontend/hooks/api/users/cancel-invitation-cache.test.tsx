import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useCancelInvitation } from "./invitations";
import type { Invitation, InvitationsResponse } from "./types";

jest.mock("@/lib/api-client", () => ({
  apiClient: { delete: jest.fn(), get: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: {} }, refetch: jest.fn() }),
}));

const row = (id: string): Invitation => ({
  id,
  email: `${id}@example.com`,
  role: "member",
  expiresAt: "2026-11-01T00:00:00.000Z",
  acceptedAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  status: "PENDING",
  revokedAt: null,
  declinedAt: null,
  moduleAccess: [],
  deliveryFailed: false,
});

describe("useCancelInvitation (QA 2026-10-14: row stayed Pending until reload)", () => {
  it("shows the revoke in the cached list from the response, without refetching the list", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const key = usersAndCommerceQueryKeys.users.invitations({ limit: 20 });
    const page: InvitationsResponse = {
      data: [row("inv-1"), row("inv-2")],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    };
    client.setQueryData(key, page);
    (apiClient.delete as jest.Mock).mockResolvedValue({ success: true });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCancelInvitation(), { wrapper });
    await act(() => result.current.mutateAsync("inv-1"));

    const after = client.getQueryData<InvitationsResponse>(key);
    expect(after?.data[0]).toMatchObject({ id: "inv-1", status: "REVOKED" });
    expect(after?.data[0]?.revokedAt).toEqual(expect.any(String));
    expect(after?.data[1]?.status).toBe("PENDING");
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
