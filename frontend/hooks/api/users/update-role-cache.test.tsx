import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useUpdateUserRole } from "./bulk-mutations";
import type { User, UsersResponse } from "./types";

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), get: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: {} }, refetch: jest.fn() }),
}));

const user = (id: string, role: User["role"]): User => ({ id, email: `${id}@example.com`, role }) as unknown as User;

describe("useUpdateUserRole (RBAC-B-004: list showed the old role until reload)", () => {
  it("writes the new role into every cached members page from the response", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const key = usersAndCommerceQueryKeys.users.list({ limit: 25 });
    const page: UsersResponse = {
      data: [user("u1", "MEMBER"), user("u2", "MEMBER")],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    };
    client.setQueryData(key, page);
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true, userId: "u1", role: "ORG_ADMIN" });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateUserRole(), { wrapper });
    await act(() => result.current.mutateAsync({ userId: "u1", role: "ORG_ADMIN" }));

    const after = client.getQueryData<UsersResponse>(key);
    expect(after?.data.map((u) => u.role)).toEqual(["ORG_ADMIN", "MEMBER"]);
  });
});
