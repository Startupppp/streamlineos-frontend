import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCancelOccurrence } from "@/hooks/api/calendar-mutations";
import type { CalendarEventsResponse, CalendarListItem } from "@/hooks/api/calendar-types";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { calendarProjectionFields } from "./calendar-projection-fixtures";

const mockDelete = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: { delete: (...args: unknown[]) => mockDelete(...args) },
}));

const firstStart = "2026-10-26T04:30:00.000Z";
const cancelledStart = "2026-11-02T04:30:00.000Z";
const laterStart = "2026-11-09T04:30:00.000Z";

function occurrence(start: string): CalendarListItem {
  const id = `event-39-${start}`;
  return {
    id,
    title: "Weekly QA event",
    start,
    end: new Date(new Date(start).getTime() + 3_600_000).toISOString(),
    category: "meeting",
    source: "event",
    ...calendarProjectionFields(id, start),
  };
}

it("removes the cancelled occurrence from every cached Calendar window before refetch", async () => {
  mockDelete.mockResolvedValue({ id: 1 });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const firstKey = platformHierarchyQueryKeys.calendar.events("org", "member", "2026-10-01", "2026-11-01");
  const secondKey = platformHierarchyQueryKeys.calendar.events("org", "member", "2026-11-01", "2026-12-01");
  const response: CalendarEventsResponse = {
    events: [occurrence(firstStart), occurrence(cancelledStart), occurrence(laterStart)],
    failures: [],
    truncated: false,
    coverageState: "complete",
    coverage: [],
  };
  queryClient.setQueryData(firstKey, response);
  queryClient.setQueryData(secondKey, response);
  const historyKey = platformHierarchyQueryKeys.calendar.history("org", "member", "");
  const history = { pages: [{ events: [occurrence(cancelledStart)] }], pageParams: [""] };
  queryClient.setQueryData(historyKey, history);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCancelOccurrence(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ eventId: 39, occurrenceStart: cancelledStart });
  });

  for (const key of [firstKey, secondKey]) {
    expect(queryClient.getQueryData<CalendarEventsResponse>(key)?.events.map((event) => event.id)).toEqual([
      `event-39-${firstStart}`,
      `event-39-${laterStart}`,
    ]);
  }
  expect(queryClient.getQueryData(historyKey)).toEqual(history);
  expect(mockDelete).toHaveBeenCalledTimes(1);
});
