import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";

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
