/**
 * A board autoloads up to 500 tickets and the timeline drew one SVG group per
 * dated ticket — a hit target, a rule, a label and a bar each — to show the ~15
 * rows a viewport holds. These assert the mounted row count follows the
 * viewport, that a row far down the board is still reachable by scrolling, and
 * that the bound did not cost the chart its list semantics or its keyboard.
 */
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
