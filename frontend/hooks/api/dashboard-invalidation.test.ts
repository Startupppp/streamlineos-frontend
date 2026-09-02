import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { useCreateAnnouncement, useDeleteAnnouncement } from "./dashboard";
import { queryKeys } from "@/lib/query-keys";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({ data: { orgId: "org-1", user: { id: "u-1" } } }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ id: 1, content: "test", isPinned: false, expiresAt: null, createdAt: "", authorId: "u-1", authorName: null, authorFirstName: null, authorLastName: null }),
    delete: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("dashboard mutation prefix invalidation", () => {
  let client: QueryClient;
  let invalidate: jest.SpyInstance;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    invalidate = jest.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
  });

  it("useCreateAnnouncement invalidates only the announcements key on success", async () => {
    const { result } = renderHook(() => useCreateAnnouncement(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ title: "Hi", content: "Hello" });
    });

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard.announcements(),
    });
    expect(invalidate).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.dashboard.all }),
    );
    expect(invalidate).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.dashboard.stats() }),
    );
  });

  it("useDeleteAnnouncement invalidates only the announcements key on success", async () => {
    const { result } = renderHook(() => useDeleteAnnouncement(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard.announcements(),
    });
    expect(invalidate).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.dashboard.all }),
    );
  });
});
