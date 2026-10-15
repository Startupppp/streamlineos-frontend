import { runInNewContext } from "node:vm";
import { calendarBookingEmbedCode } from "./calendar-booking-embed-code";

describe("Calendar booking embed code", () => {
  it("creates a fresh callback state and accepts only the owning iframe", () => {
    const code = calendarBookingEmbedCode("https://app.test/calendar/book/booking-token");
    const script = code.split("<script>\n")[1]?.split("\n</script>")[0];
    expect(script).toBeDefined();
    const frameWindow = {};
    const frame = { src: "", tagName: "IFRAME", contentWindow: frameWindow };
    const received: Array<{ type: string; detail: unknown }> = [];
    let receive: ((event: { origin: string; source: object; data: Record<string, unknown> }) => void) | null = null;
    let removed = 0;
    runInNewContext(script ?? "", {
      URL,
      crypto: { randomUUID: () => "state-123" },
      document: { currentScript: { previousElementSibling: frame } },
      window: {
        addEventListener: (_type: string, handler: typeof receive) => { receive = handler; },
        removeEventListener: (_type: string, handler: typeof receive) => { if (receive === handler) removed += 1; },
        dispatchEvent: (event: { type: string; detail: unknown }) => { received.push(event); },
      },
      CustomEvent: class {
        constructor(public type: string, public options: { detail: unknown }) {}
        get detail() { return this.options.detail; }
      },
    });
    expect(new URL(frame.src).searchParams.get("state")).toBe("state-123");
    const handler = receive as unknown as (event: { origin: string; source: object; data: Record<string, unknown> }) => void;
    const data = { type: "streamline.calendar.booking.completed", state: "state-123", facts: { outcome: "confirmed" } };
    handler({ origin: "https://other.test", source: frameWindow, data });
    handler({ origin: "https://app.test", source: {}, data });
    handler({ origin: "https://app.test", source: frameWindow, data: { ...data, state: "wrong" } });
    expect(received).toHaveLength(0);
    handler({ origin: "https://app.test", source: frameWindow, data });
    handler({ origin: "https://app.test", source: frameWindow, data });
    expect(received.map((event) => ({ type: event.type, detail: event.detail }))).toEqual([
      { type: "streamline:booking:completed", detail: { outcome: "confirmed" } },
    ]);
    expect(removed).toBe(1);
  });
});
