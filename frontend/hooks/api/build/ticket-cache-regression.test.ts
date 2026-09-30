import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";
import { useUpdateTicket } from "./ticket-update-mutation";
import { useBulkUpdateTickets, useRankTicket, useDeleteTicket } from "./ticket-create-rank-mutations";
import { useAddTicketRelation, useRemoveTicketRelation } from "./ticket-sub-resources";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

jest.mock("@/lib/api-client", () => ({ apiClient: { patch: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true, useAccess: () => ({ data: { isOrgOwner: true }, refetch: jest.fn() }) }));
beforeEach(() => jest.clearAllMocks());

it("a failed edit preserves newer ticket changes, project fields and loaded pages", async () => {
  const client = createAppQueryClient();
  client.setDefaultOptions({ mutations: { retry: false } });
  const ticket = { id: 1, title: "Before", priority: "LOW" };
  const page = { data: [ticket], pagination: { nextCursor: "next" } };
  const board = queryKeys.projects.tickets({ projectId: 42, view: "board" });
  const detail = queryKeys.projects.detail(42);
  const single = queryKeys.projects.ticket(42, 1);
  client.setQueryData(board, { pages: [page], pageParams: [undefined] });
  client.setQueryData(detail, { name: "Original project", tickets: [ticket] });
  client.setQueryData(single, ticket);
  const pending = Promise.withResolvers<void>();
  jest.mocked(apiClient.patch).mockImplementationOnce(async () => { await pending.promise; throw new Error("conflict"); });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useUpdateTicket(42), { wrapper });
  let failed: Promise<unknown> = Promise.resolve();
  act(() => { failed = result.current.mutateAsync({ ticketId: 1, version: 2, title: "Failed edit", priority: "HIGH" }).catch((error: unknown) => error); });
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
  await act(async () => { await result.current.mutateAsync({ ticketId: 1, version: 2, title: "After" }); });
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
  await act(async () => { await expect(result.current.mutateAsync({ ticketId: 1, version: 2, title: "After" })).rejects.toThrow("conflict"); });
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
  await act(async () => { await result.current.mutateAsync({ ticketId: 1, version: 2, ...change }); });
  expect(client.getQueryState(queryKeys.dashboard.myIssues())?.isInvalidated).toBe(true);
  if (field === "title") expect(client.getQueryState(queryKeys.projectReports.velocity(42))?.isInvalidated).toBe(false);
  client.clear();
});

it("bulk updates invalidate actual detail, board, cycle and report cache entries", async () => {
  const client = createAppQueryClient();
  const board = queryKeys.projects.tickets({ projectId: 42, view: "board", status: "OPEN" });
  const keys = [queryKeys.projects.ticket(42, 1), queryKeys.projects.ticket(42, 2), board, queryKeys.projects.cycles(42), queryKeys.projects.analytics(42), queryKeys.projectReports.velocity(42), queryKeys.dashboard.myIssues()];
  for (const key of keys) client.setQueryData(key, key === board ? { data: [{ id: 1, version: 3, status: "OPEN" }, { id: 2, version: 5, status: "OPEN" }], pagination: { nextCursor: null } } : []);
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
      { id: 1, priority: "MEDIUM", title: "One", version: 1 },
      { id: 2, priority: "HIGH", title: "Two", version: 4 },
      { id: 3, priority: "URGENT", title: "Three", version: 2 },
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
      { id: 1, priority: "LOW", title: "One", version: 1 },
      { id: 2, priority: "LOW", title: "Two", version: 4 },
      { id: 3, priority: "URGENT", title: "Three", version: 2 },
    ],
  });
  expect(apiClient.post).toHaveBeenCalledWith(
    "/build/42/tickets/bulk",
    expect.objectContaining({ versions: { 1: 1, 2: 4 } }),
    undefined,
    expect.anything(),
  );
  client.clear();
});

it("bulk update posts each selected ticket's own cached version keyed by id rather than one shared or fabricated token", async () => {
  const client = createAppQueryClient();
  const board = queryKeys.projects.tickets({ projectId: 42, view: "board" });
  client.setQueryData(board, {
    data: [
      { id: 1, version: 7, status: "OPEN" },
      { id: 2, version: 12, status: "OPEN" },
      { id: 3, version: 2, status: "OPEN" },
    ],
    pagination: { nextCursor: null },
  });
  jest.mocked(apiClient.post).mockResolvedValue({ updated: 2, ticketIds: [1, 2] });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useBulkUpdateTickets(42), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ ticketIds: [1, 2], status: "DONE" });
  });

  expect(apiClient.post).toHaveBeenCalledWith(
    "/build/42/tickets/bulk",
    { ticketIds: [1, 2], status: "DONE", versions: { 1: 7, 2: 12 } },
    undefined,
    expect.anything(),
  );
  client.clear();
});

it("bulk update rejects instead of defaulting a version when a selected ticket has no cached copy anywhere", async () => {
  const client = createAppQueryClient();
  const board = queryKeys.projects.tickets({ projectId: 42, view: "board" });
  client.setQueryData(board, {
    data: [{ id: 1, version: 7, status: "OPEN" }],
    pagination: { nextCursor: null },
  });
  jest.mocked(apiClient.post).mockResolvedValue({ updated: 1, ticketIds: [1] });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useBulkUpdateTickets(42), { wrapper });

  await expect(
    result.current.mutateAsync({ ticketIds: [1, 99], status: "DONE" }),
  ).rejects.toThrow("99");
  expect(apiClient.post).not.toHaveBeenCalled();
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
  await act(async () => { await result.current.mutateAsync({ projectId: 42, ticketId: 1, version: 1, status: "DONE", beforeTicketId: null, afterTicketId: null }); });
  for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(settled).toHaveBeenCalledTimes(1);
  expect(client.getQueryState(queryKeys.projectReports.velocity(99))?.isInvalidated).toBe(false);
  client.clear();
});

it("rank updates patch an active board without issuing a duplicate list request", async () => {
  const client = createAppQueryClient();
  const board = queryKeys.projects.tickets({ projectId: 42, view: "board" });
  const ticket = { id: 1, title: "Ticket", rank: "a0", status: "OPEN" };
  const page = { data: [ticket], pagination: { nextCursor: null } };
  const queryFn = jest.fn(async () => page);
  const observer = new QueryObserver(client, { queryKey: board, queryFn });
  const unsubscribe = observer.subscribe(() => {});
  await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
  jest.mocked(apiClient.patch).mockResolvedValue({ id: 1, rank: "a1", status: "DONE" });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useRankTicket(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ projectId: 42, ticketId: 1, version: 1, status: "DONE", beforeTicketId: null, afterTicketId: null });
  });

  expect(client.getQueryData(board)).toEqual({
    ...page,
    data: [{ ...ticket, rank: "a1", status: "DONE" }],
  });
  expect(client.getQueryState(board)?.isInvalidated).toBe(true);
  expect(queryFn).toHaveBeenCalledTimes(1);
  unsubscribe();
  client.clear();
});

it("adding a dependency invalidates the critical path the new edge moves", async () => {
  const client = createAppQueryClient();
  const criticalPath = buildWorkQueryKeys.projectReports.criticalPath(42);
  client.setQueryData(criticalPath, { criticalPath: [], totalDuration: 0 });
  jest.mocked(apiClient.post).mockResolvedValue({ id: 5 });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useAddTicketRelation(1, 42), { wrapper });
  await act(async () => { await result.current.mutateAsync({ relatedTicketId: 2, relationType: "blocks" }); });
  expect(client.getQueryState(criticalPath)?.isInvalidated).toBe(true);
  client.clear();
});

it("removing a dependency invalidates the critical path the dropped edge moves", async () => {
  const client = createAppQueryClient();
  const criticalPath = buildWorkQueryKeys.projectReports.criticalPath(42);
  client.setQueryData(criticalPath, { criticalPath: [], totalDuration: 0 });
  jest.mocked(apiClient.delete).mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useRemoveTicketRelation(1, 42), { wrapper });
  await act(async () => { await result.current.mutateAsync(2); });
  expect(client.getQueryState(criticalPath)?.isInvalidated).toBe(true);
  client.clear();
});

it("deleting a ticket invalidates the lists and reports it fed rather than patching them out", async () => {
  const client = createAppQueryClient();
  const board = queryKeys.projects.tickets({ projectId: 42, view: "board" });
  const criticalPath = buildWorkQueryKeys.projectReports.criticalPath(42);
  const velocity = buildWorkQueryKeys.projectReports.velocity(42);
  client.setQueryData(board, { pages: [{ data: [{ id: 1, title: "Doomed" }], pagination: { nextCursor: null } }], pageParams: [undefined] });
  client.setQueryData(criticalPath, { criticalPath: [], totalDuration: 0 });
  client.setQueryData(velocity, { pages: [], pageParams: [] });
  jest.mocked(apiClient.delete).mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useDeleteTicket(42), { wrapper });
  await act(async () => { await result.current.mutateAsync({ ticketId: 1 }); });
  expect(client.getQueryState(board)?.isInvalidated).toBe(true);
  expect(client.getQueryState(criticalPath)?.isInvalidated).toBe(true);
  expect(client.getQueryState(velocity)?.isInvalidated).toBe(true);
  client.clear();
});
