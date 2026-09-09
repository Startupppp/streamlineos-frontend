import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { apiClient } from "@/lib/api-client";
import { useTicketActivity } from "./ticket-activity";

jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

it("follows the activity cursor and retains loaded history when the next page fails", async () => {
  const client = createAppQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  jest.mocked(apiClient.get)
    .mockResolvedValueOnce({ data: [{ id: 1 }], pagination: { nextCursor: "older" } })
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ data: [{ id: 2 }], pagination: { nextCursor: null } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useTicketActivity(42, 1), { wrapper });
  await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]));
  await act(async () => { await result.current.fetchNextPage(); });
  await waitFor(() => expect(result.current.isFetchNextPageError).toBe(true));
  expect(result.current.data).toEqual([{ id: 1 }]);
  await act(async () => { await result.current.fetchNextPage(); });
  await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }]));
  expect(apiClient.get).toHaveBeenLastCalledWith("/build/42/tickets/1/activity", { limit: 25, cursor: "older" }, expect.any(AbortSignal), expect.any(Function));
  expect(result.current.hasNextPage).toBe(false);
  client.clear();
});
