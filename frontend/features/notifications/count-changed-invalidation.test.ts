import { act, renderHook, waitFor } from "@testing-library/react";
import type { QueryKey } from "@tanstack/react-query";
import {
  clearStreamToken,
  useNotificationEvents,
} from "./use-notification-events";
import { clearBackendTokenCache } from "@/lib/api-client";
import { consumeNotificationStream } from "./notification-event-stream";
import type {
  IncomingNotification,
  NotificationStreamHandlers,
} from "./notification-event-stream";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

jest.mock("./notification-event-stream", () => ({
  consumeNotificationStream: jest.fn(),
}));

const invalidateQueries = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
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

const consume = jest.mocked(consumeNotificationStream);
const toastMock = jest.mocked(toast);

const arriving: IncomingNotification = {
  id: 1,
  title: "Deploy finished",
  message: "main is live",
  priority: "NORMAL",
  category: "SYSTEM",
  link: null,
};

type Captured = {
  onNotification?: (notification: IncomingNotification) => void;
  handlers?: NotificationStreamHandlers;
};

function captureHandlers(): Captured {
  const captured: Captured = {};
  consume.mockImplementation((_url, _token, _signal, onNotification, handlers) => {
    captured.onNotification = onNotification;
    captured.handlers = handlers;
    return new Promise<void>(() => undefined);
  });
  return captured;
}

function invalidatedKeys(): string[] {
  return invalidateQueries.mock.calls.map((call) => {
    const filters: unknown = call[0];
    const key =
      typeof filters === "object" && filters !== null && "queryKey" in filters
        ? (filters as { queryKey?: QueryKey }).queryKey
        : undefined;
    return JSON.stringify(key);
  });
}

describe("a count_changed frame refreshes the inbox, because all eleven backend emit sites change list membership or row state and not only the scalar count", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    consume.mockReset();
    fetchMock.mockReset();
    invalidateQueries.mockReset();
    toastMock.mockReset();
    clearBackendTokenCache();
    clearStreamToken();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockImplementation((input: unknown) =>
      Promise.resolve(
        String(input).includes("/notifications/events/token")
          ? { ok: true, json: async () => ({ token: "stream-token" }) }
          : { ok: true, json: async () => ({ backendJwt: "jwt-1" }) },
      ),
    );
  });

  it("invalidates the lists, the unread count and the unified inbox", async () => {
    const captured = captureHandlers();
    renderHook(() => useNotificationEvents());
    await waitFor(() => expect(captured.handlers?.onCountChanged).toBeDefined());

    act(() => captured.handlers?.onCountChanged?.());

    const keys = invalidatedKeys();
    expect(keys).toContain(JSON.stringify(queryKeys.notifications.lists()));
    expect(keys).toContain(JSON.stringify(queryKeys.notifications.unreadCount()));
    expect(keys).toContain(JSON.stringify(queryKeys.inbox.all));
  });

  it("raises no toast, because the change was made by this user somewhere else and was already announced there", async () => {
    const captured = captureHandlers();
    renderHook(() => useNotificationEvents());
    await waitFor(() => expect(captured.handlers?.onCountChanged).toBeDefined());

    act(() => captured.handlers?.onCountChanged?.());

    expect(toastMock).not.toHaveBeenCalled();
  });

  it("still toasts on a notification frame, so the silent count path did not disarm the announcement", async () => {
    const captured = captureHandlers();
    renderHook(() => useNotificationEvents());
    await waitFor(() => expect(captured.onNotification).toBeDefined());

    act(() => captured.onNotification?.(arriving));

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(invalidatedKeys()).toContain(
      JSON.stringify(queryKeys.notifications.unreadCount()),
    );
  });

  it("keeps resetting the reconnect backoff through onOpen after the handler argument became an object", async () => {
    const captured = captureHandlers();
    renderHook(() => useNotificationEvents());
    await waitFor(() => expect(captured.handlers).toBeDefined());

    expect(typeof captured.handlers?.onOpen).toBe("function");
  });
});
