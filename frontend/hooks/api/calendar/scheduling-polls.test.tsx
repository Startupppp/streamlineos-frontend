import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReplaceSchedulingPollGuest, useSchedulingPoll } from "./scheduling-polls";
import type { SchedulingPoll } from "./scheduling-polls-schema";

const get = jest.fn();
const put = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { scopes: { "calendar:read": "all", "calendar:write": "all" } }, isError: false }),
  useCan: () => true,
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
    unavailable: false,
  }),
}));

jest.mock("./booking-rules", () => ({
  useBookingScope: () => ({ orgId: "org-1", userId: "user-1", membershipId: 7, accessVersion: 1, canRead: true }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => get(...args), put: (...args: unknown[]) => put(...args) },
}));

const pollId = "11111111-1111-4111-8111-111111111111";
const voterId = "22222222-2222-4222-8222-222222222222";
const optionId = "33333333-3333-4333-8333-333333333333";
const poll: SchedulingPoll = {
  id: pollId,
  title: "Schedule review",
  status: "open",
  expiresAt: "2026-10-23T12:00:00.000Z",
  holdOptions: false,
  selectedOptionId: null,
  finalizedBookingId: null,
  version: 2,
  options: [{
    id: optionId,
    startAt: "2026-10-22T10:00:00.000Z",
    endAt: "2026-10-22T10:30:00.000Z",
    status: "proposed",
    votes: { yes: 1, maybe: 1, no: 0 },
  }],
  viewer: null,
  guestVoters: [{ voterId, email: "old@example.com", name: "Old guest", voterVersion: 1 }],
};

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  get.mockReset();
  put.mockReset();
});

it("refreshes organizer vote counts after replacing a guest's signed link", async () => {
  const refreshed: SchedulingPoll = {
    ...poll,
    version: 3,
    options: [{ ...poll.options[0], votes: { yes: 0, maybe: 0, no: 0 } }],
    guestVoters: [{ voterId, email: "new@example.com", name: "New guest", voterVersion: 2 }],
  };
  get.mockResolvedValueOnce(poll);
  put.mockResolvedValue({ voterId, email: "new@example.com", token: "new-link", voterVersion: 2, optionVotes: refreshed.options.map((option) => ({ id: option.id, votes: option.votes })) });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const { result } = renderHook(() => ({
    detail: useSchedulingPoll(pollId),
    replace: useReplaceSchedulingPollGuest(),
  }), { wrapper: wrapper(client) });

  await waitFor(() => expect(result.current.detail.data?.options[0].votes).toEqual({ yes: 1, maybe: 1, no: 0 }));
  await act(async () => {
    await result.current.replace.mutateAsync({
      pollId,
      voterId,
      expectedVoterVersion: 1,
      email: "new@example.com",
      name: "New guest",
    });
  });

  expect(put).toHaveBeenCalledWith(
    `/calendar/scheduling-polls/${pollId}/voters/${voterId}`,
    { expectedVoterVersion: 1, email: "new@example.com", name: "New guest" },
    undefined,
    expect.anything(),
  );
  expect(get).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(result.current.detail.data?.options[0].votes).toEqual({ yes: 0, maybe: 0, no: 0 }));
  expect(result.current.detail.data?.guestVoters?.[0]).toMatchObject({ email: "new@example.com", voterVersion: 2 });
});
