import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { usePushSubscription } from "./use-push-subscription";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const api = jest.mocked(apiClient);

let queryClient: QueryClient;

function Wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

function renderPushHook(userId: string | undefined) {
  return renderHook(() => usePushSubscription(userId), { wrapper: Wrapper });
}

interface FakeNotification {
  permission: NotificationPermission;
  requestPermission: jest.Mock<Promise<NotificationPermission>, []>;
}

const notification: FakeNotification = {
  permission: "granted",
  requestPermission: jest.fn(async () => notification.permission),
};

const subscriptionJson = (endpoint: string) => ({
  endpoint,
  unsubscribe: jest.fn(async () => true),
  toJSON: () => ({ endpoint, keys: { p256dh: `${endpoint}-p256dh`, auth: `${endpoint}-auth` } }),
});

const pushManager = {
  getSubscription: jest.fn(),
  subscribe: jest.fn(),
};

/**
 * A real EventTarget for the container too: the hook listens for the service
 * worker's `pushsubscriptionchange` announcement here, so the test dispatches a
 * genuine MessageEvent rather than reaching into the handler.
 */
class FakeServiceWorkerContainer extends EventTarget {
  register = jest.fn(async () => ({ pushManager }));
}

let serviceWorker = new FakeServiceWorkerContainer();

/**
 * A real EventTarget so the hook's `change` listener is exercised rather than
 * simulated, counting live listeners so a test can wait for the asynchronous
 * `permissions.query()` to have wired one up instead of guessing at microtasks.
 */
class FakePermissionStatus extends EventTarget {
  liveListeners = 0;

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.liveListeners += 1;
    super.addEventListener(type, listener, options);
  }

  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    this.liveListeners -= 1;
    super.removeEventListener(type, listener, options);
  }
}

let permissionStatus = new FakePermissionStatus();
const permissions = { query: jest.fn(async () => permissionStatus) };

async function whenPermissionListenerIsLive(): Promise<void> {
  await waitFor(() => expect(permissionStatus.liveListeners).toBe(1));
}

function define(target: object, property: string, value: unknown): void {
  Object.defineProperty(target, property, { value, configurable: true, writable: true });
}

beforeAll(() => {
  define(globalThis, "Notification", notification);
  define(globalThis, "PushManager", function PushManager() {});
});

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  window.localStorage.clear();
  serviceWorker = new FakeServiceWorkerContainer();
  define(navigator, "serviceWorker", serviceWorker);
  notification.permission = "granted";
  permissionStatus = new FakePermissionStatus();
  // clearAllMocks wipes recorded calls but not implementations, and one test
  // replaces this one with a rejection.
  permissions.query.mockImplementation(async () => permissionStatus);
  define(navigator, "permissions", permissions);
  pushManager.getSubscription.mockResolvedValue(null);
  pushManager.subscribe.mockResolvedValue(subscriptionJson("https://push.example/new"));
  api.get.mockResolvedValue({ key: "dGVzdC1rZXk" });
  api.post.mockResolvedValue(undefined);
  api.delete.mockResolvedValue(undefined);
});

describe("usePushSubscription", () => {
  it("re-registers the subscription the browser already holds", async () => {
    pushManager.getSubscription.mockResolvedValue(subscriptionJson("https://push.example/kept"));

    renderPushHook("user-1");

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/push/subscribe",
        {
          endpoint: "https://push.example/kept",
          p256dh: "https://push.example/kept-p256dh",
          auth: "https://push.example/kept-auth",
          userAgent: navigator.userAgent.slice(0, 255),
        },
        undefined,
        expect.any(Function),
      ),
    );
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("creates and posts a subscription when the browser holds none", async () => {
    renderPushHook("user-1");

    await waitFor(() => expect(pushManager.subscribe).toHaveBeenCalledTimes(1));
    expect(pushManager.subscribe.mock.calls[0]?.[0]).toMatchObject({ userVisibleOnly: true });
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/push/subscribe",
        expect.objectContaining({ endpoint: "https://push.example/new" }),
        undefined,
        expect.any(Function),
      ),
    );
  });

  it("does not post the same subscription again when the shell remounts", async () => {
    pushManager.getSubscription.mockResolvedValue(subscriptionJson("https://push.example/kept"));

    const first = renderPushHook("remount-user");
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    first.unmount();

    renderPushHook("remount-user");

    await waitFor(() => expect(serviceWorker.register).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it("reports a permission revoked from browser site settings while the tab is open", async () => {
    const { result } = renderPushHook("user-1");

    await waitFor(() => expect(result.current.permission).toBe("granted"));
    expect(permissions.query).toHaveBeenCalledWith({ name: "notifications" });
    await whenPermissionListenerIsLive();

    await act(async () => {
      notification.permission = "denied";
      permissionStatus.dispatchEvent(new Event("change"));
    });

    expect(result.current.permission).toBe("denied");
  });

  it("re-reads permission on tab focus where the permissions API cannot answer", async () => {
    permissions.query.mockRejectedValue(new TypeError("notifications is not a valid permission"));

    const { result } = renderPushHook("user-1");

    await waitFor(() => expect(result.current.permission).toBe("granted"));

    await act(async () => {
      notification.permission = "denied";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.permission).toBe("denied");
  });

  it("registers once permission is granted from browser settings, with no re-prompt", async () => {
    notification.permission = "default";

    const { result } = renderPushHook("user-1");

    await waitFor(() => expect(result.current.permission).toBe("default"));
    expect(serviceWorker.register).not.toHaveBeenCalled();
    await whenPermissionListenerIsLive();

    await act(async () => {
      notification.permission = "granted";
      permissionStatus.dispatchEvent(new Event("change"));
    });

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(notification.requestPermission).not.toHaveBeenCalled();
  });

  it("touches neither the service worker nor the API while permission is denied", async () => {
    notification.permission = "denied";

    const { result } = renderPushHook("user-1");

    await waitFor(() => expect(result.current.permission).toBe("denied"));
    expect(serviceWorker.register).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("drops its permission listener on unmount", async () => {
    const { unmount } = renderPushHook("user-1");

    await whenPermissionListenerIsLive();
    unmount();

    expect(permissionStatus.liveListeners).toBe(0);
  });

  it("does nothing at all without a signed-in user", async () => {
    renderPushHook(undefined);

    await waitFor(() => expect(permissions.query).toHaveBeenCalled());
    expect(serviceWorker.register).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  /**
   * RT-005. `DELETE /push/subscribe` existed on the backend with no caller in the
   * whole frontend, so the only way off push was revoking the browser permission —
   * which is effectively permanent and which the app can never undo. These four
   * pin the control that closes it.
   */
  it("disable() drops the browser subscription and deletes the server row", async () => {
    const sub = subscriptionJson("https://push.example/kept");
    pushManager.getSubscription.mockResolvedValue(sub);

    const { result } = renderPushHook("user-1");
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.disable();
    });

    expect(sub.unsubscribe).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith(
      "/push/subscribe?endpoint=https%3A%2F%2Fpush.example%2Fkept",
      undefined,
      undefined,
      expect.any(Function),
    );
    expect(result.current.optedOut).toBe(true);
  });

  it("does not silently re-subscribe a browser that was turned off", async () => {
    pushManager.getSubscription.mockResolvedValue(subscriptionJson("https://push.example/kept"));

    const first = renderPushHook("user-1");
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    await act(async () => {
      await first.result.current.disable();
    });
    first.unmount();

    api.post.mockClear();
    pushManager.getSubscription.mockResolvedValue(null);
    const { result } = renderPushHook("user-1");

    await waitFor(() => expect(result.current.optedOut).toBe(true));
    expect(api.post).not.toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("persists the subscription the service worker rotated", async () => {
    pushManager.getSubscription.mockResolvedValue(subscriptionJson("https://push.example/kept"));

    renderPushHook("user-1");
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    api.post.mockClear();

    await act(async () => {
      serviceWorker.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "push-subscription-changed",
            endpoint: "https://push.example/rotated",
            p256dh: "rotated-p256dh",
            auth: "rotated-auth",
          },
        }),
      );
    });

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/push/subscribe",
        {
          endpoint: "https://push.example/rotated",
          p256dh: "rotated-p256dh",
          auth: "rotated-auth",
          userAgent: navigator.userAgent.slice(0, 255),
        },
        undefined,
        expect.any(Function),
      ),
    );
  });

  it("persists one rotated subscription once when two mounted consumers receive it", async () => {
    pushManager.getSubscription.mockResolvedValue(subscriptionJson("https://push.example/kept"));

    renderPushHook("rotation-user");
    renderPushHook("rotation-user");
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    api.post.mockClear();

    await act(async () => {
      serviceWorker.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "push-subscription-changed",
            endpoint: "https://push.example/rotated-once",
            p256dh: "rotated-p256dh",
            auth: "rotated-auth",
          },
        }),
      );
    });

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  });

  it("ignores a worker message that is not a subscription rotation", async () => {
    pushManager.getSubscription.mockResolvedValue(subscriptionJson("https://push.example/kept"));

    renderPushHook("user-1");
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    api.post.mockClear();

    await act(async () => {
      serviceWorker.dispatchEvent(
        new MessageEvent("message", { data: { type: "something-else", endpoint: 42 } }),
      );
    });

    expect(api.post).not.toHaveBeenCalled();
  });
});
