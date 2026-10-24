import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import {
  useHuddleHeartbeat,
  useJoinHuddle,
  useLeaveHuddle,
  useStartHuddle,
} from "@/hooks/api/chat-huddles";
import type { Huddle } from "@/types/chat";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "u-me", name: "Me", image: null } },
    status: "authenticated",
  }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
}));

const CHANNEL = 7;
const KEY = collaborationQueryKeys.chat.huddle(CHANNEL);

function participant(id: number, userId: string): Huddle["participants"][number] {
  return {
    id,
    huddleId: 11,
    joinedAt: "2026-09-02T12:00:00.000Z",
    leftAt: null,
    userId,
    user: { id: userId, name: userId, image: null },
  };
}

function huddle(participants: Huddle["participants"]): Huddle {
  return {
    id: 11,
    channelId: CHANNEL,
    status: "active",
    calendarEventId: null,
    meetingProvider: "google_meet",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    startedAt: "2026-09-02T12:00:00.000Z",
    endedAt: null,
    startedBy: "u-other",
    startedByUser: { id: "u-other", name: "Other" },
    participants,
  };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe("huddle cache patching", () => {
  it("join adds the viewer to the active huddle before the server answers", async () => {
    const { client, wrapper } = setup();
    client.setQueryData(KEY, huddle([participant(1, "u-other")]));
    (apiClient.post as jest.Mock).mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useJoinHuddle(), { wrapper });
    act(() => {
      result.current.mutate({ huddleId: 11, channelId: CHANNEL });
    });
    await waitFor(() => {
      const cached = client.getQueryData<Huddle>(KEY);
      expect(cached?.participants.map((p) => p.userId)).toEqual(["u-other", "u-me"]);
    });
  });

  it("join gives each optimistic participant its own negative id so two huddles never collide", async () => {
    const { client, wrapper } = setup();
    const otherKey = collaborationQueryKeys.chat.huddle(8);
    client.setQueryData(KEY, huddle([participant(1, "u-other")]));
    client.setQueryData(otherKey, { ...huddle([participant(1, "u-other")]), id: 11, channelId: 8 });
    (apiClient.post as jest.Mock).mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useJoinHuddle(), { wrapper });
    act(() => {
      result.current.mutate({ huddleId: 11, channelId: CHANNEL });
      result.current.mutate({ huddleId: 11, channelId: 8 });
    });
    await waitFor(() => {
      expect(client.getQueryData<Huddle>(otherKey)?.participants).toHaveLength(2);
    });
    const ids = [KEY, otherKey].map((k) => client.getQueryData<Huddle>(k)?.participants[1]?.id);
    expect(ids[0]).toBeLessThan(0);
    expect(ids[1]).toBeLessThan(0);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("join does not add the viewer twice", async () => {
    const { client, wrapper } = setup();
    client.setQueryData(KEY, huddle([participant(1, "u-me")]));
    (apiClient.post as jest.Mock).mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useJoinHuddle(), { wrapper });
    act(() => {
      result.current.mutate({ huddleId: 11, channelId: CHANNEL });
    });
    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    expect(client.getQueryData<Huddle>(KEY)?.participants).toHaveLength(1);
  });

  it("join rolls the cache back when the server refuses", async () => {
    const { client, wrapper } = setup();
    const before = huddle([participant(1, "u-other")]);
    client.setQueryData(KEY, before);
    (apiClient.post as jest.Mock).mockRejectedValue(new ApiError("No", 403));
    const { result } = renderHook(() => useJoinHuddle(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ huddleId: 11, channelId: CHANNEL }).catch(() => undefined);
    });
    expect(client.getQueryData<Huddle>(KEY)).toEqual(before);
  });

  it("leave removes the viewer from the active huddle before the server answers", async () => {
    const { client, wrapper } = setup();
    client.setQueryData(KEY, huddle([participant(1, "u-other"), participant(2, "u-me")]));
    (apiClient.post as jest.Mock).mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useLeaveHuddle(), { wrapper });
    act(() => {
      result.current.mutate({ huddleId: 11, channelId: CHANNEL });
    });
    await waitFor(() => {
      expect(client.getQueryData<Huddle>(KEY)?.participants.map((p) => p.userId)).toEqual(["u-other"]);
    });
  });

  it("leave clears the active huddle when the viewer was the last participant, because the backend ends it", async () => {
    const { client, wrapper } = setup();
    client.setQueryData(KEY, huddle([participant(2, "u-me")]));
    (apiClient.post as jest.Mock).mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useLeaveHuddle(), { wrapper });
    act(() => {
      result.current.mutate({ huddleId: 11, channelId: CHANNEL });
    });
    await waitFor(() => expect(client.getQueryData<Huddle | null>(KEY)).toBeNull());
  });

  it("leave rolls back when the server refuses", async () => {
    const { client, wrapper } = setup();
    const before = huddle([participant(1, "u-other"), participant(2, "u-me")]);
    client.setQueryData(KEY, before);
    (apiClient.post as jest.Mock).mockRejectedValue(new ApiError("Boom", 500));
    const { result } = renderHook(() => useLeaveHuddle(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ huddleId: 11, channelId: CHANNEL }).catch(() => undefined);
    });
    expect(client.getQueryData<Huddle>(KEY)).toEqual(before);
  });

  it("start seeds the active huddle cache from the response instead of refetching it", async () => {
    const { client, wrapper } = setup();
    const started = huddle([participant(1, "u-me")]);
    (apiClient.post as jest.Mock).mockResolvedValue(started);
    const { result } = renderHook(() => useStartHuddle(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL });
    });
    expect(client.getQueryData<Huddle>(KEY)).toEqual(started);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("start cancels an in-flight active-huddle fetch before seeding so a stale null cannot overwrite it", async () => {
    const { client, wrapper } = setup();
    const cancel = jest.spyOn(client, "cancelQueries");
    (apiClient.post as jest.Mock).mockResolvedValue(huddle([participant(1, "u-me")]));
    const { result } = renderHook(() => useStartHuddle(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL });
    });
    expect(cancel).toHaveBeenCalledWith({ queryKey: KEY, exact: true });
  });
});

describe("huddle heartbeat", () => {
  it("stops heartbeating silently on HUDDLE_NOT_JOINED and refreshes the huddle state", async () => {
    jest.useFakeTimers();
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    (apiClient.patch as jest.Mock).mockRejectedValue(new ApiError("Not joined", 409, "HUDDLE_NOT_JOINED"));
    renderHook(() => useHuddleHeartbeat(11, CHANNEL, true), { wrapper });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    expect(apiClient.patch).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: KEY }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(120_000);
    });
    expect(apiClient.patch).toHaveBeenCalledTimes(1);
    const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("restarts after a rejoin while mounted, when joined state flips back to true", async () => {
    jest.useFakeTimers();
    const { wrapper } = setup();
    (apiClient.patch as jest.Mock).mockRejectedValueOnce(new ApiError("Not joined", 409, "HUDDLE_NOT_JOINED"));
    (apiClient.patch as jest.Mock).mockResolvedValue({ ok: true });
    const hook = renderHook(({ joined }) => useHuddleHeartbeat(11, CHANNEL, joined), {
      wrapper,
      initialProps: { joined: true },
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000);
    });
    expect(apiClient.patch).toHaveBeenCalledTimes(1);
    hook.rerender({ joined: false });
    hook.rerender({ joined: true });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    expect(apiClient.patch).toHaveBeenCalledTimes(2);
  });

  it("does not heartbeat while the viewer is not joined", async () => {
    jest.useFakeTimers();
    const { wrapper } = setup();
    renderHook(() => useHuddleHeartbeat(11, CHANNEL, false), { wrapper });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(90_000);
    });
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("keeps heartbeating after a transient failure", async () => {
    jest.useFakeTimers();
    const { wrapper } = setup();
    (apiClient.patch as jest.Mock).mockRejectedValue(new ApiError("Down", 503));
    renderHook(() => useHuddleHeartbeat(11, CHANNEL, true), { wrapper });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(90_000);
    });
    expect(apiClient.patch).toHaveBeenCalledTimes(3);
  });
});
