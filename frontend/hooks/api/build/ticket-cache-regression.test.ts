import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";
import { useUpdateTicket } from "./ticket-update-mutation";
import { useBulkUpdateTickets, useRankTicket } from "./ticket-create-rank-mutations";

jest.mock("@/lib/api-client", () => ({ apiClient: { patch: jest.fn(), post: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true, useAccess: () => ({ data: { isOrgOwner: true }, refetch: jest.fn() }) }));
beforeEach(() => jest.clearAllMocks());

it("a failed edit preserves newer ticket changes, project fields and loaded pages", async () => {
  const client = createAppQueryClient();
  client.setDefaultOptions({ mutations: { retry: false } });
  const ticket = { id: 1, title: "Before", priority: "LOW" };
  const page = { data: [ticket], pagination: { nextCursor: "next" } };
  const board = queryKeys.projects.tickets({ projectId: 42, view: "board" });
  const detail = queryKeys.projects.detail(42);
  const single = queryKeys.projects.ticket(1);
  client.setQueryData(board, { pages: [page], pageParams: [undefined] });
  client.setQueryData(detail, { name: "Original project", tickets: [ticket] });
  client.setQueryData(single, ticket);
  const pending = Promise.withResolvers<void>();
  jest.mocked(apiClient.patch).mockImplementationOnce(async () => { await pending.promise; throw new Error("conflict"); });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useUpdateTicket(42), { wrapper });
  let failed: Promise<unknown> = Promise.resolve();
  act(() => { failed = result.current.mutateAsync({ ticketId: 1, title: "Failed edit", priority: "HIGH" }).catch((error: unknown) => error); });
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
  const newer = { ...ticket, title: "Newer successful edit", priority: "HIGH" };
  const extra = { data: [{ id: 2, title: "New page", priority: "LOW" }], pagination: { nextCursor: null } };
  client.setQueryData(board, { pages: [{ ...page, data: [newer] }, extra], pageParams: [undefined, "next"] });
  client.setQueryData(detail, { name: "Renamed project", tickets: [newer, extra.data[0]] });
  client.setQueryData(single, newer);
  await act(async () => { pending.resolve(); await failed; });
  const restored = { ...newer, priority: "LOW" };
  expect(client.getQueryData(board)).toEqual({ pages: [{ ...page, data: [restored] }, extra], pageParams: [undefined, "next"] });
  expect(client.getQueryData(detail)).toEqual({ name: "Renamed project", tickets: [restored, extra.data[0]] });
  expect(client.getQueryData(single)).toEqual(restored);
  client.clear();
});

it("updates an infinite board without destroying its pages", async () => {
  const client = createAppQueryClient();
  const key = queryKeys.projects.tickets({ projectId: 42, view: "board" });
  const original = { pages: [{ data: [{ id: 1, title: "Before" }], pagination: { nextCursor: null } }], pageParams: [undefined] };
  client.setQueryData(key, original);
  jest.mocked(apiClient.patch).mockResolvedValue({ updated: true });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useUpdateTicket(42), { wrapper });
  await act(async () => { await result.current.mutateAsync({ ticketId: 1, title: "After" }); });
  expect(client.getQueryData(key)).toEqual({ ...original, pages: [{ ...original.pages[0], data: [{ id: 1, title: "After" }] }] });
  expect(apiClient.patch).toHaveBeenCalledTimes(1);
  client.clear();
});

it("rolls back filtered multipage boards and paginated lists after failure", async () => {
  const client = createAppQueryClient();
  client.setDefaultOptions({ mutations: { retry: false } });
  const page = { data: [{ id: 1, title: "Before" }], pagination: { nextCursor: "next" } };
  const original = { pages: [page, { ...page, data: [{ id: 2, title: "Other" }] }], pageParams: [undefined, "next"] };
  const board = queryKeys.projects.tickets({ projectId: 42, view: "board", status: "OPEN" });
  const list = queryKeys.projects.tickets({ projectId: 42, limit: 25 });
  client.setQueryData(board, original);
  client.setQueryData(list, page);
  jest.mocked(apiClient.patch).mockRejectedValue(new Error("conflict"));
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useUpdateTicket(42), { wrapper });
  await act(async () => { await expect(result.current.mutateAsync({ ticketId: 1, title: "After" })).rejects.toThrow("conflict"); });
  expect(client.getQueryData(board)).toEqual(original);
  expect(client.getQueryData(list)).toEqual(page);
  client.clear();
});

it.each(["title", "priority", "dueDate"])("invalidates My Issues after %s changes without refreshing unrelated reports for text changes", async (field) => {
  const client = createAppQueryClient();
  client.setQueryData(queryKeys.dashboard.myIssues(), []);
  client.setQueryData(queryKeys.projectReports.velocity(42), []);
  jest.mocked(apiClient.patch).mockResolvedValue({ updated: true });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useUpdateTicket(42), { wrapper });
  const change = field === "title" ? { title: "After" } : field === "priority" ? { priority: "HIGH" as const } : { dueDate: "2026-09-10" };
  await act(async () => { await result.current.mutateAsync({ ticketId: 1, ...change }); });
  expect(client.getQueryState(queryKeys.dashboard.myIssues())?.isInvalidated).toBe(true);
  if (field === "title") expect(client.getQueryState(queryKeys.projectReports.velocity(42))?.isInvalidated).toBe(false);
  client.clear();
});

it("bulk updates invalidate actual detail, board, sprint and report cache entries", async () => {
  const client = createAppQueryClient();
  const board = queryKeys.projects.tickets({ projectId: 42, view: "board", status: "OPEN" });
  const keys = [queryKeys.projects.ticket(1), queryKeys.projects.ticket(2), board, queryKeys.projects.sprints(42), queryKeys.projects.analytics(42), queryKeys.projectReports.velocity(42), queryKeys.dashboard.myIssues()];
  for (const key of keys) client.setQueryData(key, key === board ? { data: [], pagination: { nextCursor: null } } : []);
  jest.mocked(apiClient.post).mockResolvedValue({ updated: 2, ticketIds: [1, 2] });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useBulkUpdateTickets(42), { wrapper });
  await act(async () => { await result.current.mutateAsync({ ticketIds: [1, 2], status: "DONE" }); });
  for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  client.clear();
});

it("bulk updates patch every loaded ticket collection before refetch completes", async () => {
  const client = createAppQueryClient();
  const board = queryKeys.projects.tickets({ projectId: 42, view: "board" });
  const original = {
    data: [
      { id: 1, priority: "MEDIUM", title: "One" },
      { id: 2, priority: "HIGH", title: "Two" },
      { id: 3, priority: "URGENT", title: "Three" },
    ],
    pagination: { nextCursor: null },
  };
  client.setQueryData(board, original);
  jest.mocked(apiClient.post).mockResolvedValue({ updated: 2, ticketIds: [1, 2] });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useBulkUpdateTickets(42), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ ticketIds: [1, 2], priority: "LOW" });
  });

  expect(client.getQueryData(board)).toEqual({
    ...original,
    data: [
      { id: 1, priority: "LOW", title: "One" },
      { id: 2, priority: "LOW", title: "Two" },
      { id: 3, priority: "URGENT", title: "Three" },
    ],
  });
  client.clear();
});

it("rank status changes refresh counts, reports and dashboard and call the caller", async () => {
  const client = createAppQueryClient();
  const keys = [queryKeys.projects.columnCounts(42), queryKeys.projectReports.velocity(42), queryKeys.dashboard.myIssues()];
  for (const key of keys) client.setQueryData(key, []);
  const settled = jest.fn();
  client.setQueryData(queryKeys.projectReports.velocity(99), []);
  jest.mocked(apiClient.patch).mockResolvedValue({ id: 1, rank: "a", status: "DONE" });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useRankTicket({ onSettled: settled }), { wrapper });
  await act(async () => { await result.current.mutateAsync({ projectId: 42, ticketId: 1, status: "DONE", beforeTicketId: null, afterTicketId: null }); });
  for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(settled).toHaveBeenCalledTimes(1);
  expect(client.getQueryState(queryKeys.projectReports.velocity(99))?.isInvalidated).toBe(false);
  client.clear();
});
