import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { createElement, useState, type ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";
import { useKanbanDrag } from "./use-kanban-drag";
import type { KanbanTicket } from "../shared/types";

jest.mock("@/lib/api-client", () => ({ apiClient: { patch: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true, useAccess: () => ({ data: { isOrgOwner: true }, refetch: jest.fn() }) }));
jest.mock("@/hooks/api/build/custom-states", () => ({ useReorderCustomStates: () => ({ mutate: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

it("failed drag restores only its fields without removing newer local edits", async () => {
  const client = createAppQueryClient();
  client.setDefaultOptions({ mutations: { retry: false } });
  const ticket = { id: 1, title: "Before", status: "OPEN", type: "BUG", rank: "1000" };
  const pending = Promise.withResolvers<void>();
  jest.mocked(apiClient.patch).mockReset().mockImplementationOnce(async () => { await pending.promise; throw new Error("conflict"); });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => {
    const [current, setCurrent] = useState<KanbanTicket[]>([ticket]);
    const drag = useKanbanDrag({
      projectId: 42, statuses: [], rowBy: "none", hideCompleted: false, canManage: true,
      visibleColumns: [], orderedColumns: [], optimisticTickets: current, optimisticStatuses: [],
      setOptimisticTickets: setCurrent, setOptimisticStatuses: jest.fn(), setOptimisticColumnOrder: jest.fn(),
      isDraggingRef: { current: false }, dragStartRef: { current: null },
    });
    return { drag, current, setCurrent };
  }, { wrapper });
  await act(async () => result.current.drag.onDragEnd({ draggableId: "1", type: "DEFAULT", reason: "DROP", mode: "FLUID", source: { droppableId: "OPEN", index: 0 }, destination: { droppableId: "DONE", index: 0 }, combine: null }));
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
  act(() => result.current.setCurrent((current) => [...current.map((row) => ({ ...row, title: "Newer title" })), { ...ticket, id: 2, title: "Added" }]));
  await act(async () => pending.resolve());
  await waitFor(() => expect(result.current.current).toEqual([{ ...ticket, title: "Newer title" }, { ...ticket, id: 2, title: "Added" }]));
  client.clear();
});

it.each([false, true])("persists drag on an infinite board and restores its page metadata on failure=%s", async (fails) => {
  const client = createAppQueryClient();
  client.setDefaultOptions({ mutations: { retry: false } });
  const ticket = { id: 1, title: "Before", status: "OPEN", type: "BUG", rank: "a0" };
  const original = { pages: [{ data: [ticket], pagination: { nextCursor: null } }], pageParams: [undefined] };
  const keys = [queryKeys.projects.tickets({ projectId: 42, view: "board" }), queryKeys.projects.tickets({ projectId: 42, view: "board", priority: "HIGH" })];
  for (const key of keys) client.setQueryData(key, original);
  const queryFn = jest.fn(async () => original);
  const observer = new QueryObserver(client, {
    queryKey: keys[0],
    queryFn,
    staleTime: Infinity,
  });
  const unsubscribe = observer.subscribe(() => {});
  jest.mocked(apiClient.patch).mockReset();
  if (fails) jest.mocked(apiClient.patch).mockRejectedValue(new Error("conflict"));
  else jest.mocked(apiClient.patch).mockResolvedValue({ id: 1, rank: "a1", status: "DONE" });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useKanbanDrag({
    projectId: 42, statuses: [], rowBy: "none", hideCompleted: false, canManage: true,
    visibleColumns: [], orderedColumns: [], optimisticTickets: [ticket], optimisticStatuses: [],
    setOptimisticTickets: jest.fn(), setOptimisticStatuses: jest.fn(), setOptimisticColumnOrder: jest.fn(),
    isDraggingRef: { current: false }, dragStartRef: { current: null },
  }), { wrapper });
  await act(async () => result.current.onDragEnd({ draggableId: "1", type: "DEFAULT", reason: "DROP", mode: "FLUID", source: { droppableId: "OPEN", index: 0 }, destination: { droppableId: "DONE", index: 0 }, combine: null }));
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
  for (const key of keys) await waitFor(() => expect(client.getQueryData(key)).toEqual(fails ? original : { ...original, pages: [{ ...original.pages[0], data: [{ ...ticket, rank: "a1", status: "DONE" }] }] }));
  expect(queryFn).not.toHaveBeenCalled();
  unsubscribe();
  client.clear();
});
