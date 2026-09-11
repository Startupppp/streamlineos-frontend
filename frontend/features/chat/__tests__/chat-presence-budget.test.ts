import { renderHook, act } from "@testing-library/react";
import {
  computeFallbackDelay,
  FALLBACK_BASE_MS,
  FALLBACK_MAX_MS,
  FALLBACK_JITTER_MS,
  useChatPresence,
} from "../use-chat-presence";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("ably/react", () => ({
  useAbly: jest.fn(),
}));

// use-chat-presence imports useChatHeartbeat from the leaf module, not the
// "@/hooks/api" barrel. Jest keys mocks by resolved module, so the mock has to
// name the same specifier the hook under test imports — mocking the barrel
// leaves the real heartbeat (and its useAccess/useQuery chain) in place.
jest.mock("@/hooks/api/chat-core-mutations-b", () => ({
  useChatHeartbeat: jest.fn(),
}));

const { useSession } = jest.requireMock("next-auth/react") as {
  useSession: jest.Mock;
};
const { useAbly } = jest.requireMock("ably/react") as {
  useAbly: jest.Mock;
};
const { useChatHeartbeat } = jest.requireMock(
  "@/hooks/api/chat-core-mutations-b",
) as {
  useChatHeartbeat: jest.Mock;
};

type ConnectionEventName =
  | "connected"
  | "disconnected"
  | "failed"
  | "closed"
  | "initialized"
  | "connecting"
  | "suspended"
  | "closing";

interface MockConnectionEventEmitter {
  state: string;
  on: jest.Mock;
  off: jest.Mock;
  emit: (event: ConnectionEventName) => void;
}

interface MockPresence {
  enter: jest.Mock;
  leave: jest.Mock;
}

interface MockChannel {
  presence: MockPresence;
}

interface MockAbly {
  connection: MockConnectionEventEmitter;
  channels: { get: (name: string) => MockChannel };
}

function makeConnectionEmitter(): MockConnectionEventEmitter {
  const listeners = new Map<string, Array<() => void>>();
  let currentState = "initialized";

  return {
    get state() {
      return currentState;
    },
    set state(v: string) {
      currentState = v;
    },
    on: jest.fn().mockImplementation((event: string, fn: () => void) => {
      const existing = listeners.get(event) ?? [];
      listeners.set(event, [...existing, fn]);
    }),
    off: jest.fn().mockImplementation((event: string, fn: () => void) => {
      const existing = listeners.get(event) ?? [];
      listeners.set(
        event,
        existing.filter((l) => l !== fn),
      );
    }),
    emit(event: ConnectionEventName) {
      currentState = event;
      for (const fn of listeners.get(event) ?? []) fn();
    },
  };
}

function makeAblyMock(): MockAbly {
  const connection = makeConnectionEmitter();
  const presence: MockPresence = {
    enter: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  };
  const channel: MockChannel = { presence };

  return {
    connection,
    channels: { get: () => channel },
  };
}

function makeLockManager(mode: "exclusive-first-wins" | "all-run" = "exclusive-first-wins"): LockManager {
  let held = false;
  return {
    request: jest.fn().mockImplementation(
      async (
        _name: string,
        callback: (lock: Lock | null) => Promise<void>,
      ) => {
        if (mode === "exclusive-first-wins" && held) return;
        held = true;
        await callback(null);
        held = false;
      },
    ),
    query: jest.fn(),
  } as unknown as LockManager;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe("computeFallbackDelay", () => {
  it("returns a value within [base, base + jitter] for attempt 0", () => {
    const delay = computeFallbackDelay(0);
    expect(delay).toBeGreaterThanOrEqual(FALLBACK_BASE_MS);
    expect(delay).toBeLessThan(FALLBACK_BASE_MS + FALLBACK_JITTER_MS);
  });

  it("grows with attempt", () => {
    const d0 = computeFallbackDelay(0) - FALLBACK_JITTER_MS;
    const d1 = computeFallbackDelay(1) - FALLBACK_JITTER_MS;
    const d2 = computeFallbackDelay(2) - FALLBACK_JITTER_MS;
    expect(d1).toBeGreaterThan(d0);
    expect(d2).toBeGreaterThan(d1);
  });

  it("caps at FALLBACK_MAX_MS + FALLBACK_JITTER_MS", () => {
    const delay = computeFallbackDelay(20);
    expect(delay).toBeLessThanOrEqual(FALLBACK_MAX_MS + FALLBACK_JITTER_MS);
  });
});

describe("useChatPresence — Ably channel presence", () => {
  let ablyMock: MockAbly;

  beforeEach(() => {
    ablyMock = makeAblyMock();
    useAbly.mockReturnValue(ablyMock);
    useSession.mockReturnValue({
      data: { orgId: "org-1", user: { id: "user-1" } },
      status: "authenticated",
    });
    useChatHeartbeat.mockReturnValue({ mutate: jest.fn() });
    Object.defineProperty(navigator, "locks", {
      value: makeLockManager(),
      configurable: true,
    });
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  it("enters presence on the org channel when Ably is connected", () => {
    ablyMock.connection.state = "connected";
    const { unmount } = renderHook(() => useChatPresence());
    const channel = ablyMock.channels.get("chat:org-1:presence");
    expect(channel.presence.enter).toHaveBeenCalledTimes(1);
    expect(channel.presence.enter).toHaveBeenCalledWith({ userId: "user-1" });
    unmount();
  });

  it("does not enter presence when Ably is disconnected", () => {
    ablyMock.connection.state = "disconnected";
    const { unmount } = renderHook(() => useChatPresence());
    const channel = ablyMock.channels.get("chat:org-1:presence");
    expect(channel.presence.enter).not.toHaveBeenCalled();
    unmount();
  });

  it("enters presence exactly once after reconnect (reconnect guard)", () => {
    ablyMock.connection.state = "disconnected";
    const { unmount } = renderHook(() => useChatPresence());
    const channel = ablyMock.channels.get("chat:org-1:presence");

    act(() => {
      ablyMock.connection.emit("connected");
    });
    expect(channel.presence.enter).toHaveBeenCalledTimes(1);

    act(() => {
      ablyMock.connection.emit("connected");
    });
    expect(channel.presence.enter).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("re-enters presence after a disconnect then reconnect", () => {
    ablyMock.connection.state = "connected";
    const { unmount } = renderHook(() => useChatPresence());
    const channel = ablyMock.channels.get("chat:org-1:presence");

    expect(channel.presence.enter).toHaveBeenCalledTimes(1);

    act(() => {
      ablyMock.connection.emit("disconnected");
    });
    expect(channel.presence.leave).toHaveBeenCalledTimes(1);

    act(() => {
      ablyMock.connection.emit("connected");
    });
    expect(channel.presence.enter).toHaveBeenCalledTimes(2);

    unmount();
  });

  it("leaves presence on cleanup", () => {
    ablyMock.connection.state = "connected";
    const { unmount } = renderHook(() => useChatPresence());
    const channel = ablyMock.channels.get("chat:org-1:presence");
    expect(channel.presence.enter).toHaveBeenCalledTimes(1);
    unmount();
    expect(channel.presence.leave).toHaveBeenCalledTimes(1);
  });

  it("skips presence effects when orgId or userId are absent", () => {
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });
    const { unmount } = renderHook(() => useChatPresence());
    const channel = ablyMock.channels.get("chat:org-1:presence");
    expect(channel.presence.enter).not.toHaveBeenCalled();
    unmount();
  });
});

describe("useChatPresence — fallback heartbeat load budget", () => {
  let mutate: jest.Mock;
  let ablyMock: MockAbly;

  beforeEach(() => {
    mutate = jest.fn();
    ablyMock = makeAblyMock();
    ablyMock.connection.state = "disconnected";
    useAbly.mockReturnValue(ablyMock);
    useSession.mockReturnValue({
      data: { orgId: "org-1", user: { id: "user-1" } },
      status: "authenticated",
    });
    useChatHeartbeat.mockReturnValue({ mutate });
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  it("zero heartbeats fire while Ably is connected", async () => {
    ablyMock.connection.state = "connected";
    Object.defineProperty(navigator, "locks", {
      value: makeLockManager(),
      configurable: true,
    });

    const { unmount } = renderHook(() => useChatPresence());

    await act(async () => {
      jest.advanceTimersByTime(FALLBACK_MAX_MS * 3);
    });

    expect(mutate).not.toHaveBeenCalled();
    unmount();
  });

  it("exactly 1 heartbeat fires per interval — only the leader tab fires", async () => {
    let holdCount = 0;
    let releaseRef: (() => void) | null = null;

    const exclusiveLock: LockManager = {
      request: jest.fn().mockImplementation(
        async (
          _name: string,
          callback: (lock: Lock | null) => Promise<void>,
        ) => {
          if (holdCount > 0) {
            await new Promise<void>((resolve) => {
              releaseRef = resolve;
            });
          }
          holdCount++;
          await callback(null);
          holdCount--;
          if (releaseRef) {
            releaseRef();
            releaseRef = null;
          }
        },
      ),
      query: jest.fn(),
    } as unknown as LockManager;

    Object.defineProperty(navigator, "locks", {
      value: exclusiveLock,
      configurable: true,
    });

    const N = 5;
    const unmounts: Array<() => void> = [];

    for (let i = 0; i < N; i++) {
      const { unmount } = renderHook(() => useChatPresence());
      unmounts.push(unmount);
    }

    await act(async () => {
      jest.advanceTimersByTime(FALLBACK_BASE_MS + FALLBACK_JITTER_MS + 1);
    });

    const callsAfterOneTick = mutate.mock.calls.length;
    expect(callsAfterOneTick).toBeGreaterThanOrEqual(1);
    expect(callsAfterOneTick).toBeLessThanOrEqual(2);

    for (const unmount of unmounts) unmount();
  });

  it("no heartbeat fires when document is hidden", async () => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(navigator, "locks", {
      value: makeLockManager(),
      configurable: true,
    });

    const { unmount } = renderHook(() => useChatPresence());

    await act(async () => {
      jest.advanceTimersByTime(FALLBACK_MAX_MS * 3);
    });

    expect(mutate).not.toHaveBeenCalled();
    unmount();

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("no heartbeat fires when browser is offline", async () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, "locks", {
      value: makeLockManager(),
      configurable: true,
    });

    const { unmount } = renderHook(() => useChatPresence());

    await act(async () => {
      jest.advanceTimersByTime(FALLBACK_MAX_MS * 3);
    });

    expect(mutate).not.toHaveBeenCalled();
    unmount();
  });

  it("fallback stops immediately when Ably reconnects mid-interval", async () => {
    Object.defineProperty(navigator, "locks", {
      value: makeLockManager(),
      configurable: true,
    });

    const { unmount } = renderHook(() => useChatPresence());

    await act(async () => {
      jest.advanceTimersByTime(FALLBACK_BASE_MS + FALLBACK_JITTER_MS + 1);
    });

    const callsBeforeReconnect = mutate.mock.calls.length;
    expect(callsBeforeReconnect).toBeGreaterThanOrEqual(1);

    act(() => {
      ablyMock.connection.emit("connected");
    });

    await act(async () => {
      jest.advanceTimersByTime(FALLBACK_MAX_MS * 3);
    });

    expect(mutate.mock.calls.length).toBe(callsBeforeReconnect);
    unmount();
  });
});
