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
  jest.useRealTimers();
});

describe("the notification stream token is minted once per stream, not once per mount", () => {
  it("mints a fresh token for a genuinely new stream, because the backend deletes the token on first use (consumeToken) and expires it after 120s, so replaying the previous one only yields a 401", async () => {
    const first = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(tokenMints()).toBe(1));

    first.unmount();
    const second = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(tokenMints()).toBe(2));

    second.unmount();
  });

  it("mints once when several components subscribe at the same time", async () => {
    const a = renderHook(() => useNotificationEvents());
    const b = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(tokenMints()).toBe(1));

    a.unmount();
    b.unmount();
  });
});
