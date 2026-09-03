import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { usePushSubscription } from "./use-push-subscription";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const api = jest.mocked(apiClient);

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
  toJSON: () => ({ endpoint, keys: { p256dh: `${endpoint}-p256dh`, auth: `${endpoint}-auth` } }),
});

const pushManager = {
  getSubscription: jest.fn(),
  subscribe: jest.fn(),
};

const serviceWorker = { register: jest.fn(async () => ({ pushManager })) };

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
  define(navigator, "serviceWorker", serviceWorker);
});

beforeEach(() => {
  jest.clearAllMocks();
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
});

describe("usePushSubscription", () => {
  it("re-registers the subscription the browser already holds", async () => {
    pushManager.getSubscription.mockResolvedValue(subscriptionJson("https://push.example/kept"));

    renderHook(() => usePushSubscription("user-1"));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/push/subscribe", {
        endpoint: "https://push.example/kept",
        p256dh: "https://push.example/kept-p256dh",
        auth: "https://push.example/kept-auth",
        userAgent: navigator.userAgent.slice(0, 255),
      }),
    );
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("creates and posts a subscription when the browser holds none", async () => {
    renderHook(() => usePushSubscription("user-1"));

    await waitFor(() => expect(pushManager.subscribe).toHaveBeenCalledTimes(1));
    expect(pushManager.subscribe.mock.calls[0]?.[0]).toMatchObject({ userVisibleOnly: true });
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/push/subscribe",
        expect.objectContaining({ endpoint: "https://push.example/new" }),
      ),
    );
  });

  it("reports a permission revoked from browser site settings while the tab is open", async () => {
    const { result } = renderHook(() => usePushSubscription("user-1"));

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

    const { result } = renderHook(() => usePushSubscription("user-1"));

    await waitFor(() => expect(result.current.permission).toBe("granted"));

    await act(async () => {
      notification.permission = "denied";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.permission).toBe("denied");
  });

  it("registers once permission is granted from browser settings, with no re-prompt", async () => {
    notification.permission = "default";

    const { result } = renderHook(() => usePushSubscription("user-1"));

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

    const { result } = renderHook(() => usePushSubscription("user-1"));

    await waitFor(() => expect(result.current.permission).toBe("denied"));
    expect(serviceWorker.register).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("drops its permission listener on unmount", async () => {
    const { unmount } = renderHook(() => usePushSubscription("user-1"));

    await whenPermissionListenerIsLive();
    unmount();

    expect(permissionStatus.liveListeners).toBe(0);
  });

  it("does nothing at all without a signed-in user", async () => {
    renderHook(() => usePushSubscription(undefined));

    await waitFor(() => expect(permissions.query).toHaveBeenCalled());
    expect(serviceWorker.register).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});
