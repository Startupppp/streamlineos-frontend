import { act, render, screen } from "@testing-library/react";
import { CalendarEventsPanel } from "./calendar-events-panel";
import { formatEventTimeRange, readerTimeZone } from "@/lib/date-utils";
import type { CalendarListItem } from "@/hooks/api/calendar";

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text, className }: { text: string; className?: string }) => (
    <span className={className}>{text}</span>
  ),
}));

const READER_ZONE = readerTimeZone();
const AUTHORED_ZONE =
  READER_ZONE === "America/New_York" ? "Asia/Kolkata" : "America/New_York";

const ROW_INDEX_ATTRIBUTE = "data-react-window-index";

type ResizeEntry = {
  target: Element;
  borderBoxSize: readonly { blockSize: number; inlineSize: number }[];
  contentRect: { height: number; width: number };
};

class ControllableResizeObserver {
  static instances: ControllableResizeObserver[] = [];

  private readonly observed = new Set<Element>();

  constructor(private readonly callback: (entries: ResizeEntry[]) => void) {
    ControllableResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.add(element);
  }

  unobserve(element: Element) {
    this.observed.delete(element);
  }

  disconnect() {
    this.observed.clear();
  }

  static reset() {
    ControllableResizeObserver.instances = [];
  }

  static measureRows(heightForIndex: (index: number) => number) {
    for (const instance of ControllableResizeObserver.instances) {
      const entries: ResizeEntry[] = [];
      for (const element of instance.observed) {
        const raw = element.getAttribute(ROW_INDEX_ATTRIBUTE);
        if (raw === null) continue;
        const blockSize = heightForIndex(Number(raw));
        entries.push({
          target: element,
          borderBoxSize: [{ blockSize, inlineSize: 360 }],
          contentRect: { height: blockSize, width: 360 },
        });
      }
      if (entries.length > 0) instance.callback(entries);
    }
  }
}

function foreignZoneEvent(
  id: string,
  start: string,
  overrides: Partial<CalendarListItem> = {},
): CalendarListItem {
  return {
    id,
    title: `Event ${id}`,
    start,
    end: start,
    allDay: false,
    color: "blue",
    category: "meeting",
    source: "event",
    timezone: AUTHORED_ZONE,
    ...overrides,
  };
}

function renderedRowOffsets(): Map<number, number> {
  const offsets = new Map<number, number>();
  for (const element of document.querySelectorAll(`[${ROW_INDEX_ATTRIBUTE}]`)) {
    if (!(element instanceof HTMLElement)) continue;
    const index = Number(element.getAttribute(ROW_INDEX_ATTRIBUTE));
    const match = /translateY\((-?[\d.]+)px\)/.exec(element.style.transform);
    if (!match?.[1]) continue;
    offsets.set(index, Number(match[1]));
  }
  return offsets;
}

describe("CalendarEventsPanel — row height comes from measurement, not a constant", () => {
  const originalResizeObserver: unknown = globalThis.ResizeObserver;

  function installResizeObserver(implementation: unknown) {
    Object.defineProperty(globalThis, "ResizeObserver", {
      value: implementation,
      configurable: true,
      writable: true,
    });
  }

  beforeEach(() => {
    ControllableResizeObserver.reset();
    installResizeObserver(ControllableResizeObserver);
  });

  afterEach(() => {
    installResizeObserver(originalResizeObserver);
  });

  it("renders the reader's own time on the foreign-zone row without a clamp that can drop it", () => {
    const event = foreignZoneEvent("tz-1", "2026-09-12T05:30:00.000Z");
    render(
      <CalendarEventsPanel mode="list" events={[event]} onSelectEvent={jest.fn()} />,
    );

    const expected = formatEventTimeRange(event.start, event.end, AUTHORED_ZONE);
    expect(expected).toContain(READER_ZONE);

    const timeLine = screen.getByText(expected);
    expect(timeLine.textContent).toContain(READER_ZONE);

    const card = screen.getByRole("button", { name: event.title });
    for (let node: HTMLElement | null = timeLine; node !== null; node = node.parentElement) {
      expect(node.className).not.toMatch(/line-clamp-\d/);
      expect(node.className).not.toMatch(/\btruncate\b/);
      if (node === card) break;
    }
  });

  it("lays rows out from the heights the browser measured, so no row overlaps the next", () => {
    const events = [
      foreignZoneEvent("tz-1", "2026-09-12T05:30:00.000Z"),
      foreignZoneEvent("tz-2", "2026-09-12T07:30:00.000Z", { location: "Bengaluru HQ" }),
      foreignZoneEvent("tz-3", "2026-09-12T09:30:00.000Z"),
    ];
    render(
      <CalendarEventsPanel mode="list" events={events} onSelectEvent={jest.fn()} />,
    );

    const measured = [44, 112, 140, 112];
    act(() => {
      ControllableResizeObserver.measureRows((index) => measured[index] ?? 0);
    });

    const offsets = renderedRowOffsets();
    expect(offsets.size).toBe(measured.length);

    let expectedOffset = 0;
    for (let index = 0; index < measured.length; index += 1) {
      expect(offsets.get(index)).toBe(expectedOffset);
      expectedOffset += measured[index] ?? 0;
    }
  });

  it("re-measurement at a narrower width pushes later rows down instead of overlapping them", () => {
    const events = [
      foreignZoneEvent("tz-1", "2026-09-12T05:30:00.000Z"),
      foreignZoneEvent("tz-2", "2026-09-12T07:30:00.000Z"),
    ];
    render(
      <CalendarEventsPanel mode="list" events={events} onSelectEvent={jest.fn()} />,
    );

    act(() => {
      ControllableResizeObserver.measureRows((index) => (index === 0 ? 44 : 80));
    });
    const wide = renderedRowOffsets();
    expect(wide.get(1)).toBe(44);
    expect(wide.get(2)).toBe(124);

    act(() => {
      ControllableResizeObserver.measureRows((index) => (index === 0 ? 44 : 112));
    });
    const narrow = renderedRowOffsets();
    const firstEventTop = narrow.get(1) ?? -1;
    const secondEventTop = narrow.get(2) ?? -1;
    expect(firstEventTop).toBe(44);
    expect(secondEventTop).toBe(156);
    expect(secondEventTop - firstEventTop).toBe(112);
  });
});
