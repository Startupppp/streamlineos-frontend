
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GanttView } from "./gantt-view";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/build/reports", () => ({
  useCriticalPath: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build/milestones", () => ({
  useProjectMilestones: () => ({ data: [] }),
}));

const mockMutate = jest.fn();

jest.mock("@/hooks/api/build/ticket-update-mutation", () => ({
  useUpdateTicket: () => ({ mutate: mockMutate }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 40;
const TOTAL = 500;

interface GanttTestTicket {
  id: number;
  title: string;
  status: string;
  type: string;
  startDate: string;
  dueDate: string;
  ticketNumber: number;
}

function makeTickets(count: number): GanttTestTicket[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Work item ${i + 1}`,
    status: "TODO",
    type: "TASK",
    startDate: "2026-01-05",
    dueDate: "2026-01-07",
    ticketNumber: i + 1,
  }));
}

function makeUndatedTickets(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: 1000 + i + 1,
    title: `Unscheduled item ${i + 1}`,
    status: "TODO",
    type: "TASK",
    ticketNumber: 1000 + i + 1,
  }));
}

const onTicketClick = jest.fn();

function renderTimeline() {
  return render(
    <GanttView tickets={makeTickets(TOTAL)} projectId={1} onTicketClick={onTicketClick} />,
  );
}

function scrollTimelineTo(top: number) {
  const scroller = document.querySelector("[class*='overflow-auto']");
  if (!scroller) throw new Error("timeline scroll container not found");
  fireEvent.scroll(scroller, { target: { scrollTop: top } });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GanttView — the mounted row count is bounded", () => {
  it("mounts a viewport of rows for a 500-ticket board, not 500", () => {
    renderTimeline();
    const rows = screen.getAllByRole("listitem");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(60);
  });

  it("mounts every row when the board already fits the viewport", () => {
    render(<GanttView tickets={makeTickets(9)} projectId={1} onTicketClick={onTicketClick} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
  });
});

describe("GanttView — nothing is lost behind the bound", () => {
  it("keeps row 200 reachable by scrolling to it", () => {
    renderTimeline();
    expect(screen.queryByLabelText("#200 Work item 200")).toBeNull();
    scrollTimelineTo(HEADER_HEIGHT + 200 * ROW_HEIGHT);
    expect(screen.getByLabelText("#200 Work item 200")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeLessThan(60);
  });

  it("keeps the scrolled band numbered against the whole board", () => {
    renderTimeline();
    scrollTimelineTo(HEADER_HEIGHT + 200 * ROW_HEIGHT);
    const row = screen.getByLabelText("#200 Work item 200");
    expect(row).toHaveAttribute("aria-posinset", "200");
    expect(row).toHaveAttribute("aria-setsize", String(TOTAL));
  });

  it("keeps the last row reachable at the bottom of the scroll", () => {
    renderTimeline();
    scrollTimelineTo(HEADER_HEIGHT + TOTAL * ROW_HEIGHT - 400);
    expect(screen.getByLabelText(`#${TOTAL} Work item ${TOTAL}`)).toBeInTheDocument();
  });
});

describe("GanttView — undated tickets appear as rows", () => {
  it("renders undated tickets as rows so tickets without dates are never silently dropped from the timeline (BUG-032)", () => {
    render(
      <GanttView
        tickets={makeUndatedTickets(5)}
        projectId={1}
        onTicketClick={onTicketClick}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("preserves the total ticket count when dated and undated tickets are mixed so no item is silently omitted (BUG-032)", () => {
    render(
      <GanttView
        tickets={[...makeTickets(3), ...makeUndatedTickets(3)]}
        projectId={1}
        onTicketClick={onTicketClick}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });
});

describe("GanttView — the windowed rows keep their semantics", () => {
  it("names the row list", () => {
    renderTimeline();
    expect(screen.getByRole("list", { name: "Timeline work items" })).toBeInTheDocument();
  });

  it("opens a ticket from the keyboard, not only from a click", async () => {
    const user = userEvent.setup();
    renderTimeline();
    const row = screen.getByLabelText("#3 Work item 3");
    row.focus();
    await user.keyboard("{Enter}");
    expect(onTicketClick).toHaveBeenCalledWith(3);
  });

  it("still opens a ticket on click", async () => {
    const user = userEvent.setup();
    renderTimeline();
    await user.click(screen.getByLabelText("#4 Work item 4"));
    expect(onTicketClick).toHaveBeenCalledWith(4);
  });
});

describe("GanttView — B-069: drag on a bar suppresses click so accidental scrolls do not open tickets", () => {
  it("does not open the ticket when the pointer moved more than 4 pixels between mousedown and click", () => {
    renderTimeline();
    const row = screen.getByLabelText("#2 Work item 2");
    fireEvent.mouseDown(row, { clientX: 100, clientY: 100 });
    fireEvent.click(row, { clientX: 115, clientY: 100 });
    expect(onTicketClick).not.toHaveBeenCalled();
  });

  it("opens the ticket when the pointer did not move between mousedown and click", () => {
    renderTimeline();
    const row = screen.getByLabelText("#2 Work item 2");
    fireEvent.mouseDown(row, { clientX: 100, clientY: 100 });
    fireEvent.click(row, { clientX: 100, clientY: 100 });
    expect(onTicketClick).toHaveBeenCalledWith(2);
  });
});

function isoDay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function renderScheduledBar() {
  render(
    <GanttView
      tickets={[{ id: 7, title: "Scheduled item", status: "TODO", type: "TASK", startDate: isoDay(0), dueDate: isoDay(2), ticketNumber: 7 }]}
      projectId={1}
      onTicketClick={onTicketClick}
    />,
  );
  const bar = document.querySelector<SVGGElement>("[data-bar-ticket-id='7']");
  if (!bar) throw new Error("bar not rendered");
  bar.setPointerCapture = jest.fn();
  return bar;
}

function pointer(bar: SVGGElement, type: "pointerdown" | "pointerup", clientX: number) {
  fireEvent(bar, new MouseEvent(type, { bubbles: true, cancelable: true, clientX }));
}

describe("GanttView — B-069: dragging a bar reschedules the ticket", () => {
  it("shifts both dates by the dragged day count and saves them", () => {
    const bar = renderScheduledBar();
    pointer(bar, "pointerdown", 100);
    pointer(bar, "pointerup", 180);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 7, startDate: isoDay(2), dueDate: isoDay(4) }),
    );
    expect(onTicketClick).not.toHaveBeenCalled();
  });

  it("opens the ticket instead of rescheduling when the bar barely moved", () => {
    const bar = renderScheduledBar();
    pointer(bar, "pointerdown", 100);
    pointer(bar, "pointerup", 102);
    expect(mockMutate).not.toHaveBeenCalled();
    expect(onTicketClick).toHaveBeenCalledWith(7);
  });
});
