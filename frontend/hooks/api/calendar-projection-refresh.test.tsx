import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { CALENDAR_PROJECTION_SIGNAL_KEY } from "@/lib/calendar-projection-cache";
import {
  useCalendarEvents,
  useSetCalendarSourcePreference,
} from "@/hooks/api/calendar";

let mockOrgId = "org-1";
let mockUserId = "user-1";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: mockOrgId, user: { id: mockUserId } },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPut = apiClient.put as jest.Mock;
const START = new Date("2026-10-01T00:00:00.000Z");
const END = new Date("2026-11-01T00:00:00.000Z");

function wrapperFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("calendar projection refresh", () => {
  beforeEach(() => {
    mockOrgId = "org-1";
    mockUserId = "user-1";
    mockedGet.mockReset();
    mockedPut.mockReset();
    mockedGet.mockResolvedValue({ events: [], failures: [], truncated: false });
    mockedPut.mockResolvedValue({ sourceKey: "tasks", enabled: false });
    focusManager.setFocused(true);
    onlineManager.setOnline(true);
  });

  afterEach(() => {
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
  });

  it("refreshes on focus, reconnect, organization switch, and a second tab signal", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const hook = renderHook(() => useCalendarEvents(START, END), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));

    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));

    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(3));

    mockOrgId = "org-2";
    hook.rerender();
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(4));

    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key: CALENDAR_PROJECTION_SIGNAL_KEY,
      newValue: "1728777600000:0.5",
    })));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(5));
    expect(client.getQueryState(
      platformHierarchyQueryKeys.calendar.events(
        "org-2",
        "user-1",
        START.toISOString(),
        END.toISOString(),
      ),
    )).toBeDefined();
  });

  it("updates source metadata and removes disabled events before the request settles", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const sourceKey = platformHierarchyQueryKeys.calendar.sources("org-1", "user-1");
    const eventsKey = platformHierarchyQueryKeys.calendar.events(
      "org-1",
      "user-1",
      START.toISOString(),
      END.toISOString(),
    );
    client.setQueryData(sourceKey, [
      { key: "tasks", label: "Tasks", module: "tasks", enabled: true },
    ]);
    client.setQueryData(eventsKey, {
      events: [
        { id: "task-1", title: "Due", start: START.toISOString(), end: START.toISOString(), category: "task", source: "task", sourceKey: "tasks" },
        { id: "event-1", title: "Meeting", start: START.toISOString(), end: END.toISOString(), category: "meeting", source: "calendar", sourceKey: "calendar" },
      ],
      failures: [],
      truncated: false,
    });
    let settle: ((value: { sourceKey: string; enabled: boolean }) => void) | undefined;
    mockedPut.mockReturnValue(new Promise((resolve) => { settle = resolve; }));
    const { result } = renderHook(() => useSetCalendarSourcePreference(), {
      wrapper: wrapperFor(client),
    });

    let mutation: Promise<unknown> | undefined;
    act(() => {
      mutation = result.current.mutateAsync({ sourceKey: "tasks", enabled: false });
    });
    await waitFor(() => {
      expect(client.getQueryData<Array<{ enabled: boolean }>>(sourceKey)?.[0]?.enabled).toBe(false);
      expect(client.getQueryData<{ events: Array<{ id: string }> }>(eventsKey)?.events).toHaveLength(1);
    });

    settle?.({ sourceKey: "tasks", enabled: false });
    await act(async () => { await mutation; });
  });
});
