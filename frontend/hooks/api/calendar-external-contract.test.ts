import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { apiClient } from "@/lib/api-client";
import { useExternalCalendarEvents } from "./calendar";
import { calendarExternalEventsContract } from "@/hooks/api/calendar-schema";

jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
let mockOrgId = "org-1";
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: mockOrgId, user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

const response = {
  events: [
    {
      id: "ext-5-g4",
      connectionId: 5,
      toolkit: "googlecalendar",
      accountEmail: "me@x.com",
      providerEventId: "g4",
      title: "Partner sync",
      start: "2027-09-14T14:00:00.000Z",
      end: "2027-09-14T15:00:00.000Z",
      allDay: false,
      timezone: "America/New_York",
      location: null,
      meetingUrl: null,
      webLink: null,
      sourceKey: "external:googlecalendar:5",
      sourceRecordId: "5:g4",
      occurrenceId: "ext-5-g4",
      status: "confirmed",
      timeKind: "timed",
      availability: "busy",
      sourceVersion: null,
      actions: { view: true, edit: false, delete: false, rsvp: false, complete: false },
      freshness: { state: "fresh", asOf: "2027-09-01T00:00:00.000Z" },
    },
  ],
  errors: [],
  complete: true,
  accounts: [
    {
      connectionId: 5,
      accountEmail: "me@x.com",
      toolkit: "googlecalendar",
      state: "complete",
      hasMore: false,
    },
  ],
};

async function wiredContract(): Promise<typeof calendarExternalEventsContract> {
  const client = createAppQueryClient();
  jest.mocked(apiClient.get).mockResolvedValue(response);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  renderHook(
    () =>
      useExternalCalendarEvents(
        new Date("2027-09-01T00:00:00.000Z"),
        new Date("2027-09-30T00:00:00.000Z"),
        true,
      ),
    { wrapper },
  );
  await waitFor(() => expect(jest.mocked(apiClient.get)).toHaveBeenCalled());
  client.clear();
  return calendarExternalEventsContract;
}

afterEach(() => {
  mockOrgId = "org-1";
  jest.mocked(apiClient.get).mockReset();
});

it("keeps the provider's authored timezone instead of stripping it at the contract", async () => {
  const contract = await wiredContract();

  const parsed = contract?.parse(response);

  expect(parsed).toEqual(response);
  expect(parsed?.events[0]?.timezone).toBe("America/New_York");
});

it("accepts a payload that omits the timezone, so a cached or zone-less event still renders", async () => {
  const contract = await wiredContract();
  const firstEvent = response.events[0];
  if (!firstEvent) throw new Error("fixture must carry one event");
  const { timezone: _omitted, ...withoutTimezone } = firstEvent;

  const parsed = contract?.parse({
    events: [withoutTimezone],
    errors: [],
    complete: true,
    accounts: response.accounts,
  });

  expect(parsed?.events[0]?.timezone).toBeUndefined();
  expect(parsed?.events[0]?.id).toBe("ext-5-g4");
});

it("rejects malformed provider timestamps before consumers receive them", () => {
  const event = response.events[0];
  if (!event) throw new Error("fixture must carry one event");

  expect(calendarExternalEventsContract.safeParse({
    ...response,
    events: [{ ...event, start: "not-a-date" }],
  }).success).toBe(false);
  expect(calendarExternalEventsContract.safeParse({
    ...response,
    events: [{ ...event, freshness: { state: "fresh", asOf: "yesterday" } }],
  }).success).toBe(false);
  expect(calendarExternalEventsContract.safeParse(response).success).toBe(true);
});

it("starts a new external window query after an organization switch", async () => {
  const client = createAppQueryClient();
  jest.mocked(apiClient.get).mockResolvedValue(response);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  const hook = renderHook(
    () => useExternalCalendarEvents(
      new Date("2027-09-01T00:00:00.000Z"),
      new Date("2027-09-30T00:00:00.000Z"),
      true,
    ),
    { wrapper },
  );
  await waitFor(() => expect(jest.mocked(apiClient.get)).toHaveBeenCalledTimes(1));

  mockOrgId = "org-2";
  hook.rerender();

  await waitFor(() => expect(jest.mocked(apiClient.get)).toHaveBeenCalledTimes(2));
  client.clear();
});
