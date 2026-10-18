import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useTakeProviderEventVersion } from "@/hooks/api/calendar-event-detail";

const mockPost = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: { post: (...args: unknown[]) => mockPost(...args), get: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = jest.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = renderHook(() => useTakeProviderEventVersion(), { wrapper });
  return { result, invalidate };
}

describe("useTakeProviderEventVersion (CAL-B-007)", () => {
  it("posts the use-provider command for the event and refreshes what it changed", async () => {
    mockPost.mockResolvedValue({ applied: true });
    const { result, invalidate } = setup();

    await act(async () => {
      await result.current.mutateAsync({ eventId: 42 });
    });

    expect(mockPost).toHaveBeenCalledWith("/calendar/events/42/sync-conflict/use-provider", {}, undefined, expect.anything());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: platformHierarchyQueryKeys.calendar.eventDetail(42), exact: true });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: platformHierarchyQueryKeys.calendar.eventsAll });
  });

  it("changes no cache when the server refuses", async () => {
    mockPost.mockRejectedValue(new Error("conflict"));
    const { result, invalidate } = setup();

    await act(async () => {
      await result.current.mutateAsync({ eventId: 42 }).catch(() => undefined);
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
