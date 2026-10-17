import { act, renderHook } from "@testing-library/react";
import { useAblyConnection } from "../use-ably-connection";

jest.mock("ably/react", () => ({ useAbly: jest.fn() }));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };

type Listener = () => void;

function makeAblyMock(initialState = "connected") {
  const listeners = new Map<string, Listener[]>();
  const connection = {
    state: initialState,
    on: jest.fn((event: string, listener: Listener) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener]);
    }),
    off: jest.fn((event: string, listener: Listener) => {
      listeners.set(
        event,
        (listeners.get(event) ?? []).filter((l) => l !== listener),
      );
    }),
  };
  function emit(event: string, nextState: string) {
    connection.state = nextState;
    for (const listener of listeners.get(event) ?? []) listener();
  }
  return { connection, channels: { get: jest.fn() }, listeners, emit };
}

function callsFor(ably: ReturnType<typeof makeAblyMock>, event: string): number {
  return ably.connection.on.mock.calls.filter((call) => call[0] === event)
    .length;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("one listener set per connection", () => {
  it("attaches a single connected listener however many consumers read the connection", () => {
    const ably = makeAblyMock();
    useAbly.mockReturnValue(ably);

    const { unmount } = renderHook(() => {
      useAblyConnection();
      useAblyConnection();
      useAblyConnection();
    });

    expect(callsFor(ably, "connected")).toBe(1);

    unmount();
  });

  it("positive control — a single consumer still attaches its listeners", () => {
    const ably = makeAblyMock();
    useAbly.mockReturnValue(ably);

    const { unmount } = renderHook(() => useAblyConnection());

    for (const event of ["connected", "disconnected", "failed", "suspended"])
      expect(callsFor(ably, event)).toBe(1);

    unmount();
  });

  it("detaches when the last consumer unmounts, so a closed panel leaks no listener", () => {
    const ably = makeAblyMock();
    useAbly.mockReturnValue(ably);

    const { unmount } = renderHook(() => useAblyConnection());
    unmount();

    expect(
      ably.connection.off.mock.calls.filter((call) => call[0] === "connected"),
    ).toHaveLength(1);
  });
});

describe("the shared verdict", () => {
  it("reports the live connection state to every consumer", () => {
    const ably = makeAblyMock("disconnected");
    useAbly.mockReturnValue(ably);

    const { result, unmount } = renderHook(() => ({
      a: useAblyConnection(),
      b: useAblyConnection(),
    }));

    expect(result.current.a.isConnected).toBe(false);
    expect(result.current.b.isConnected).toBe(false);

    act(() => {
      ably.emit("connected", "connected");
    });

    expect(result.current.a.isConnected).toBe(true);
    expect(result.current.b.isConnected).toBe(true);

    unmount();
  });

  it("surfaces a failed connection as an error message", () => {
    const ably = makeAblyMock("connected");
    useAbly.mockReturnValue(ably);

    const { result, unmount } = renderHook(() => useAblyConnection());

    act(() => {
      ably.emit("failed", "failed");
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionError).toBe(
      "Real-time connection unavailable",
    );

    unmount();
  });

  it("clears the error once the connection returns", () => {
    const ably = makeAblyMock("connected");
    useAbly.mockReturnValue(ably);

    const { result, unmount } = renderHook(() => useAblyConnection());

    act(() => {
      ably.emit("failed", "failed");
    });
    act(() => {
      ably.emit("connected", "connected");
    });

    expect(result.current.connectionError).toBeNull();

    unmount();
  });
});

describe("the reconnect signal", () => {
  it("counts a disconnected-to-connected transition, which is what a resync keys on", () => {
    const ably = makeAblyMock("connected");
    useAbly.mockReturnValue(ably);

    const { result, unmount } = renderHook(() => useAblyConnection());
    const before = result.current.reconnectCount;

    act(() => {
      ably.emit("disconnected", "disconnected");
    });
    act(() => {
      ably.emit("connected", "connected");
    });

    expect(result.current.reconnectCount).toBe(before + 1);

    unmount();
  });

  it("does not count a connected event that follows no drop, so a refocus triggers no resync", () => {
    const ably = makeAblyMock("connected");
    useAbly.mockReturnValue(ably);

    const { result, unmount } = renderHook(() => useAblyConnection());
    const before = result.current.reconnectCount;

    act(() => {
      ably.emit("connected", "connected");
    });

    expect(result.current.reconnectCount).toBe(before);

    unmount();
  });

  it("counts a recovery from suspended too", () => {
    const ably = makeAblyMock("connected");
    useAbly.mockReturnValue(ably);

    const { result, unmount } = renderHook(() => useAblyConnection());
    const before = result.current.reconnectCount;

    act(() => {
      ably.emit("suspended", "suspended");
    });
    act(() => {
      ably.emit("connected", "connected");
    });

    expect(result.current.reconnectCount).toBe(before + 1);

    unmount();
  });
});
