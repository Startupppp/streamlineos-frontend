import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";

/**
 * RT-005. `public/sw.js` is plain JavaScript served as a service worker, so no
 * import can reach it — the only honest way to pin its behaviour is to evaluate
 * the shipped file in a sandbox with a fake `self` and drive its listeners.
 *
 * What this protects: a browser that rotates a push subscription fires
 * `pushsubscriptionchange` and destroys the old endpoint. With no listener the
 * worker mints nothing, and the server keeps sending to a dead endpoint until
 * the push service answers 410. The worker cannot POST the replacement itself —
 * it holds no backend JWT — so the contract is: mint the new subscription with
 * the same application server key, and hand it to every open client.
 */
type Listener = (event: Record<string, unknown>) => unknown;

interface PushSubscriptionLike {
  endpoint: string;
  options?: { applicationServerKey?: unknown };
  toJSON?: () => { keys?: { p256dh?: string; auth?: string } };
}

interface LoadedWorker {
  listeners: Map<string, Listener>;
  subscribe: jest.Mock;
  getSubscription: jest.Mock;
  posted: unknown[];
}

function loadWorker(): LoadedWorker {
  const listeners = new Map<string, Listener>();
  const subscribe = jest.fn();
  const getSubscription = jest.fn();
  const posted: unknown[] = [];
  const clientsApi = {
    matchAll: async () => [{ postMessage: (message: unknown) => posted.push(message) }],
    claim: async () => undefined,
    openWindow: async () => undefined,
  };
  const self = {
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    skipWaiting: () => undefined,
    registration: { pushManager: { subscribe, getSubscription }, showNotification: jest.fn() },
    clients: clientsApi,
    location: { origin: "https://app.example" },
  };
  const source = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
  runInContext(source, createContext({ self, clients: clientsApi, console }));
  return { listeners, subscribe, getSubscription, posted };
}

async function fire(
  listener: Listener,
  event: Record<string, unknown>,
): Promise<void> {
  const pending: Promise<unknown>[] = [];
  await listener({ ...event, waitUntil: (p: Promise<unknown>) => pending.push(p) });
  await Promise.all(pending);
}

const withKeys = (endpoint: string, applicationServerKey?: unknown): PushSubscriptionLike => ({
  endpoint,
  options: { applicationServerKey },
  toJSON: () => ({ keys: { p256dh: `${endpoint}-p256dh`, auth: `${endpoint}-auth` } }),
});

describe("public/sw.js pushsubscriptionchange", () => {
  it("registers a pushsubscriptionchange listener at all", () => {
    const { listeners } = loadWorker();
    expect(listeners.has("pushsubscriptionchange")).toBe(true);
  });

  it("mints a replacement with the old application server key and announces it", async () => {
    const worker = loadWorker();
    worker.getSubscription.mockResolvedValue(null);
    worker.subscribe.mockResolvedValue(withKeys("https://push.example/new"));
    const listener = worker.listeners.get("pushsubscriptionchange");
    if (!listener) throw new Error("no pushsubscriptionchange listener");

    await fire(listener, { oldSubscription: withKeys("https://push.example/old", "vapid-key") });

    expect(worker.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: "vapid-key",
    });
    expect(worker.posted).toEqual([
      {
        type: "push-subscription-changed",
        endpoint: "https://push.example/new",
        p256dh: "https://push.example/new-p256dh",
        auth: "https://push.example/new-auth",
        oldEndpoint: "https://push.example/old",
      },
    ]);
  });

  it("announces the subscription the browser already replaced without minting a second", async () => {
    const worker = loadWorker();
    worker.getSubscription.mockResolvedValue(withKeys("https://push.example/rotated"));
    const listener = worker.listeners.get("pushsubscriptionchange");
    if (!listener) throw new Error("no pushsubscriptionchange listener");

    await fire(listener, { oldSubscription: withKeys("https://push.example/old", "vapid-key") });

    expect(worker.subscribe).not.toHaveBeenCalled();
    expect(worker.posted).toHaveLength(1);
  });

  it("stays silent when it has no key to resubscribe with", async () => {
    const worker = loadWorker();
    worker.getSubscription.mockResolvedValue(null);
    const listener = worker.listeners.get("pushsubscriptionchange");
    if (!listener) throw new Error("no pushsubscriptionchange listener");

    await fire(listener, { oldSubscription: { endpoint: "https://push.example/old" } });

    expect(worker.subscribe).not.toHaveBeenCalled();
    expect(worker.posted).toEqual([]);
  });
});
