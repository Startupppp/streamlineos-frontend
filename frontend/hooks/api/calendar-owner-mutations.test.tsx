import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useDeleteTask, useUpdateTask, useCompleteTask } from "@/hooks/api/tasks";
import { useLogCrmActivity } from "@/hooks/api/crm/crm-activities";
import { useUpdateHoliday } from "@/hooks/api/hr/holidays";

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: Parameters<typeof useMutation>[0]) =>
    useMutation(options),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedPost = apiClient.post as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;
const CALENDAR_KEY = platformHierarchyQueryKeys.calendar.events(
  "2026-10-01T00:00:00.000Z",
  "2026-11-01T00:00:00.000Z",
);

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(CALENDAR_KEY, { events: [] });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, Wrapper };
}

describe("source owner calendar invalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPost.mockResolvedValue({ id: 7 });
    mockedPatch.mockResolvedValue({ id: 7 });
    mockedDelete.mockResolvedValue({ success: true });
  });

  it("invalidates the old and new windows after a task due-date move", async () => {
    const { client, Wrapper } = setup();
    const { result } = renderHook(() => useUpdateTask(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ taskId: 7, input: { dueDate: "2026-12-01T09:00:00.000Z" } });
    });
    expect(client.getQueryState(CALENDAR_KEY)?.isInvalidated).toBe(true);
  });

  it("invalidates every window after a task deletion", async () => {
    const { client, Wrapper } = setup();
    const { result } = renderHook(() => useDeleteTask(), { wrapper: Wrapper });
    await act(async () => { await result.current.mutateAsync(7); });
    expect(client.getQueryState(CALENDAR_KEY)?.isInvalidated).toBe(true);
  });

  it("invalidates every window after a task status change", async () => {
    const { client, Wrapper } = setup();
    const { result } = renderHook(() => useCompleteTask(), { wrapper: Wrapper });
    await act(async () => { await result.current.mutateAsync({ taskId: 7 }); });
    expect(client.getQueryState(CALENDAR_KEY)?.isInvalidated).toBe(true);
  });

  it("keeps future CRM calendar adapters fresh after activity creation", async () => {
    const { client, Wrapper } = setup();
    const { result } = renderHook(() => useLogCrmActivity(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ title: "Follow up", type: "CALL", dueDate: "2026-10-19T10:00:00.000Z" });
    });
    expect(client.getQueryState(CALENDAR_KEY)?.isInvalidated).toBe(true);
  });

  it("invalidates every window after an HR date changes", async () => {
    const { client, Wrapper } = setup();
    const { result } = renderHook(() => useUpdateHoliday(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ holidayId: "holiday-7", date: "2026-10-20" });
    });
    expect(client.getQueryState(CALENDAR_KEY)?.isInvalidated).toBe(true);
  });
});
