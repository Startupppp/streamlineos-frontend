import { act, renderHook, waitFor } from "@testing-library/react";
import {
  clearStreamToken,
  useNotificationEvents,
} from "./use-notification-events";
import { consumeNotificationStream } from "./notification-event-stream";

jest.mock("./notification-event-stream", () => ({
  consumeNotificationStream: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1" }, status: "authenticated" }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn() }),
}));

jest.mock("@/lib/api-client", () => ({
  getBackendToken: jest.fn(async () => "backend-jwt"),
}));

const consume = jest.mocked(consumeNotificationStream);
const fetchMock = jest.fn();

function tokenMints(): number {
  return fetchMock.mock.calls.filter((call) =>
    String(call[0]).includes("/notifications/events/token"),
  ).length;
}

beforeEach(() => {
  jest.useFakeTimers();
  clearStreamToken();
  consume.mockReset();
  fetchMock.mockReset();
  consume.mockImplementation(() => new Promise<void>(() => undefined));
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ token: "stream-token" }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

describe("the notification stream token is minted once per stream, not once per mount", () => {
  it("keeps the active stream across a transient remount", async () => {
    const first = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(tokenMints()).toBe(1));

    first.unmount();
    const second = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(tokenMints()).toBe(1));

    second.unmount();
  });

  it("mints once when several components subscribe at the same time", async () => {
    const a = renderHook(() => useNotificationEvents());
    const b = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(tokenMints()).toBe(1));

    a.unmount();
    b.unmount();
  });

  it("does not open a duplicate stream when online fires while connected", async () => {
    const stream = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(consume).toHaveBeenCalledTimes(1));

    act(() => window.dispatchEvent(new Event("online")));
    await Promise.resolve();

    expect(tokenMints()).toBe(1);
    expect(consume).toHaveBeenCalledTimes(1);
    stream.unmount();
  });

  it("honors Retry-After without minting more tokens during the cooldown", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "60" }),
    });

    const stream = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(tokenMints()).toBe(1));

    act(() => jest.advanceTimersByTime(59_000));
    await Promise.resolve();
    expect(tokenMints()).toBe(1);

    act(() => jest.advanceTimersByTime(2_000));
    await waitFor(() => expect(tokenMints()).toBe(2));
    stream.unmount();
  });
});
