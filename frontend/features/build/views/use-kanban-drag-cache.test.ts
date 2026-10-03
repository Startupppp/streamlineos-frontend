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
  const ticket = { id: 1, title: "Before", status: "OPEN", type: "BUG", rank: "1000", version: 1 };
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
  const ticket = { id: 1, title: "Before", status: "OPEN", type: "BUG", rank: "a0", version: 1 };
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
  else jest.mocked(apiClient.patch).mockResolvedValue({ id: 1, rank: "a1", status: "DONE", version: 2 });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useKanbanDrag({
    projectId: 42, statuses: [], rowBy: "none", hideCompleted: false, canManage: true,
    visibleColumns: [], orderedColumns: [], optimisticTickets: [ticket], optimisticStatuses: [],
    setOptimisticTickets: jest.fn(), setOptimisticStatuses: jest.fn(), setOptimisticColumnOrder: jest.fn(),
    isDraggingRef: { current: false }, dragStartRef: { current: null },
  }), { wrapper });
  await act(async () => result.current.onDragEnd({ draggableId: "1", type: "DEFAULT", reason: "DROP", mode: "FLUID", source: { droppableId: "OPEN", index: 0 }, destination: { droppableId: "DONE", index: 0 }, combine: null }));
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
  for (const key of keys) await waitFor(() => expect(client.getQueryData(key)).toEqual(fails ? original : { ...original, pages: [{ ...original.pages[0], data: [{ ...ticket, rank: "a1", status: "DONE", version: 2 }] }] }));
  expect(queryFn).not.toHaveBeenCalled();
  unsubscribe();
  client.clear();
});

it("threads the dragged ticket's own version into the rank request instead of a hardcoded or coalesced stand-in — the backend's compare-and-swap is inert if the wrong row's version (or none) is sent", async () => {
  const client = createAppQueryClient();
  client.setDefaultOptions({ mutations: { retry: false } });
  const dragged = { id: 3, title: "Dragged", status: "OPEN", type: "BUG", rank: "b0", version: 5 };
  const other = { id: 4, title: "Other", status: "OPEN", type: "BUG", rank: "b1", version: 42 };
  jest.mocked(apiClient.patch).mockReset().mockResolvedValue({ id: 3, rank: "b2", status: "DONE" });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useKanbanDrag({
    projectId: 42, statuses: [], rowBy: "none", hideCompleted: false, canManage: true,
    visibleColumns: [], orderedColumns: [], optimisticTickets: [dragged, other], optimisticStatuses: [],
    setOptimisticTickets: jest.fn(), setOptimisticStatuses: jest.fn(), setOptimisticColumnOrder: jest.fn(),
    isDraggingRef: { current: false }, dragStartRef: { current: null },
  }), { wrapper });
  await act(async () => result.current.onDragEnd({ draggableId: "3", type: "DEFAULT", reason: "DROP", mode: "FLUID", source: { droppableId: "OPEN", index: 0 }, destination: { droppableId: "DONE", index: 0 }, combine: null }));
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
  expect(apiClient.patch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ version: 5 }),
    undefined,
    expect.anything(),
  );
  client.clear();
});

it("omits status from the rank payload when the drag is within the same column, so a same-column reorder does not change the ticket status — a status change requires a cross-column drop", async () => {
  const client = createAppQueryClient();
  client.setDefaultOptions({ mutations: { retry: false } });
  const a = { id: 1, title: "A", status: "TODO", type: "TASK", rank: "1000", version: 1 };
  const b = { id: 2, title: "B", status: "TODO", type: "TASK", rank: "2000", version: 1 };
  jest.mocked(apiClient.patch).mockReset().mockResolvedValue({ id: 1, rank: "1500", status: "TODO" });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useKanbanDrag({
    projectId: 1, statuses: [], rowBy: "none", hideCompleted: false, canManage: true,
    visibleColumns: [], orderedColumns: [], optimisticTickets: [a, b], optimisticStatuses: [],
    setOptimisticTickets: jest.fn(), setOptimisticStatuses: jest.fn(), setOptimisticColumnOrder: jest.fn(),
    isDraggingRef: { current: false }, dragStartRef: { current: null },
  }), { wrapper });
  await act(async () => result.current.onDragEnd({
    draggableId: "1", type: "TICKET", reason: "DROP", mode: "FLUID",
    source: { droppableId: "TODO", index: 0 },
    destination: { droppableId: "TODO", index: 1 },
    combine: null,
  }));
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
  const body = (apiClient.patch as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
  expect(body.status).toBeUndefined();
  client.clear();
});

it("fires rankTicket with the correct status when a cross-column drag completes — draggableId is the ticket id as a string, type is TICKET, droppableId is the destination status name: these are the exact shapes @hello-pangea/dnd emits for a virtual-mode drop", async () => {
  const client = createAppQueryClient();
  client.setDefaultOptions({ mutations: { retry: false } });
  const ticket = { id: 7, title: "T", status: "TODO", type: "TASK", rank: "a0", version: 3 };
  jest.mocked(apiClient.patch).mockReset().mockResolvedValue({ id: 7, rank: "b0", status: "IN_PROGRESS" });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useKanbanDrag({
    projectId: 1, statuses: [], rowBy: "none", hideCompleted: false, canManage: true,
    visibleColumns: [], orderedColumns: [], optimisticTickets: [ticket], optimisticStatuses: [],
    setOptimisticTickets: jest.fn(), setOptimisticStatuses: jest.fn(), setOptimisticColumnOrder: jest.fn(),
    isDraggingRef: { current: false }, dragStartRef: { current: null },
  }), { wrapper });
  await act(async () => result.current.onDragEnd({
    draggableId: "7",
    type: "TICKET",
    reason: "DROP",
    mode: "FLUID",
    source: { droppableId: "TODO", index: 0 },
    destination: { droppableId: "IN_PROGRESS", index: 0 },
    combine: null,
  }));
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
  expect(apiClient.patch).toHaveBeenCalledWith(
    expect.stringContaining("/7/rank"),
    expect.objectContaining({ status: "IN_PROGRESS" }),
    undefined,
    expect.anything(),
  );
  client.clear();
});

it("does not call rankTicket when dropping onto the exact same position in the same column, so phantom network requests cannot flip the board back to its server state", async () => {
  const client = createAppQueryClient();
  client.setDefaultOptions({ mutations: { retry: false } });
  jest.mocked(apiClient.patch).mockReset();
  const ticket = { id: 1, title: "T", status: "TODO", type: "TASK", rank: "1000", version: 1 };
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useKanbanDrag({
    projectId: 1, statuses: [], rowBy: "none", hideCompleted: false, canManage: true,
    visibleColumns: [], orderedColumns: [], optimisticTickets: [ticket], optimisticStatuses: [],
    setOptimisticTickets: jest.fn(), setOptimisticStatuses: jest.fn(), setOptimisticColumnOrder: jest.fn(),
    isDraggingRef: { current: false }, dragStartRef: { current: null },
  }), { wrapper });
  await act(async () => result.current.onDragEnd({
    draggableId: "1", type: "TICKET", reason: "DROP", mode: "FLUID",
    source: { droppableId: "TODO", index: 0 },
    destination: { droppableId: "TODO", index: 0 },
    combine: null,
  }));
  expect(apiClient.patch).not.toHaveBeenCalled();
  client.clear();
});
