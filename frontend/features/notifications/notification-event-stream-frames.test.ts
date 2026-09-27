import { consumeNotificationStream } from "./notification-event-stream";
import type { IncomingNotification } from "./notification-event-stream";

jest.mock("@/lib/observability/with-correlation", () => ({
  withCorrelation: (headers: Headers) => headers,
}));

const NOTIFICATION_PAYLOAD = {
  id: 7,
  title: "Deploy finished",
  message: "main is live",
  priority: "NORMAL",
  category: "SYSTEM",
  link: null,
};

function frame(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function stubDecodedBodyChunks(chunks: string[]): jest.Mock {
  const reader = {
    read: jest.fn(async () => {
      const value = chunks.shift();
      return value === undefined
        ? { done: true, value: undefined }
        : { done: false, value };
    }),
  };
  const fetchMock = jest.fn(async () => ({
    ok: true,
    body: { pipeThrough: () => ({ getReader: () => reader }) },
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

type Handlers = {
  onNotification: jest.Mock<void, [IncomingNotification]>;
  onCountChanged: jest.Mock<void, []>;
  onOpen: jest.Mock<void, []>;
};

function handlers(): Handlers {
  return {
    onNotification: jest.fn(),
    onCountChanged: jest.fn(),
    onOpen: jest.fn(),
  };
}

async function drain(chunks: string[], h: Handlers): Promise<void> {
  stubDecodedBodyChunks(chunks);
  await consumeNotificationStream(
    "https://api.test/notifications/events",
    "stream-token",
    new AbortController().signal,
    h.onNotification,
    { onOpen: h.onOpen, onCountChanged: h.onCountChanged },
  );
}

describe("notification stream frame dispatch", () => {
  const originalFetch = global.fetch;
  const originalDecoderStream = global.TextDecoderStream;

  beforeAll(() => {
    if (global.TextDecoderStream === undefined)
      global.TextDecoderStream = class {} as unknown as typeof TextDecoderStream;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    global.TextDecoderStream = originalDecoderStream;
  });

  it("routes a count_changed frame to onCountChanged even though it carries no notification payload", async () => {
    const h = handlers();
    await drain([frame({ type: "count_changed" })], h);
    expect(h.onCountChanged).toHaveBeenCalledTimes(1);
    expect(h.onNotification).not.toHaveBeenCalled();
  });

  it("still routes a notification frame to onNotification and never to onCountChanged", async () => {
    const h = handlers();
    await drain(
      [frame({ type: "notification", notification: NOTIFICATION_PAYLOAD })],
      h,
    );
    expect(h.onNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, title: "Deploy finished" }),
    );
    expect(h.onCountChanged).not.toHaveBeenCalled();
  });

  it("drops a notification frame whose payload is missing rather than treating it as a count change", async () => {
    const h = handlers();
    await drain([frame({ type: "notification" })], h);
    expect(h.onNotification).not.toHaveBeenCalled();
    expect(h.onCountChanged).not.toHaveBeenCalled();
  });

  it("ignores an unknown future frame type and keeps reading the frames after it", async () => {
    const h = handlers();
    await drain(
      [
        frame({ type: "digest_ready" }),
        frame({ type: "count_changed" }),
        frame({ type: "notification", notification: NOTIFICATION_PAYLOAD }),
      ],
      h,
    );
    expect(h.onCountChanged).toHaveBeenCalledTimes(1);
    expect(h.onNotification).toHaveBeenCalledTimes(1);
  });

  it("ignores the 15-second heartbeat, which carries an empty data line", async () => {
    const h = handlers();
    await drain(["data: \n\n", frame({ type: "count_changed" })], h);
    expect(h.onCountChanged).toHaveBeenCalledTimes(1);
    expect(h.onNotification).not.toHaveBeenCalled();
  });

  it("dispatches several count_changed frames arriving in one chunk", async () => {
    const h = handlers();
    await drain(
      [frame({ type: "count_changed" }) + frame({ type: "count_changed" })],
      h,
    );
    expect(h.onCountChanged).toHaveBeenCalledTimes(2);
  });

  it("fires onOpen before any frame is dispatched so backoff resets on connect", async () => {
    const h = handlers();
    await drain([frame({ type: "count_changed" })], h);
    expect(h.onOpen).toHaveBeenCalledTimes(1);
    expect(h.onOpen.mock.invocationCallOrder[0]).toBeLessThan(
      h.onCountChanged.mock.invocationCallOrder[0],
    );
  });

  it("skips a truncated non-JSON frame without tearing down the stream, and still dispatches the next good frame", async () => {
    const h = handlers();
    await drain(["data: {not-json}\n\n", frame({ type: "count_changed" })], h);
    expect(h.onCountChanged).toHaveBeenCalledTimes(1);
    expect(h.onNotification).not.toHaveBeenCalled();
  });
});
