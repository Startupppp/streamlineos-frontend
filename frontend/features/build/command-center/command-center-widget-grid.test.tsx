import { fireEvent, render, screen } from "@testing-library/react";
import { CommandCenterWidgetGrid } from "./command-center-widget-grid";
import { CommandCenterLayoutControls } from "./command-center-layout-controls";
import type { WidgetSlot, WidgetType } from "./dashboard-layout";

const mockContainerWidth = jest.fn();

jest.mock("react-grid-layout", () => ({
  ...jest.requireActual("react-grid-layout"),
  useContainerWidth: () => mockContainerWidth(),
}));

const WIDGETS: WidgetSlot[] = [
  { type: "my-issues", position: { col: 0, row: 0, w: 6, h: 6 } },
  { type: "projects", position: { col: 6, row: 0, w: 6, h: 6 } },
];

const CONTENT = Object.fromEntries(
  ["overview", "jump-to", "my-issues", "projects", "approvals", "agent-runs", "risks", "releases", "blockers"].map(
    (type) => [type, <div key={type} data-testid={`${type}-content`} />],
  ),
) as Record<WidgetType, React.ReactNode>;

function renderGrid(overrides: Partial<React.ComponentProps<typeof CommandCenterWidgetGrid>> = {}) {
  const props = {
    widgets: WIDGETS,
    content: CONTENT,
    editing: false,
    onLayoutChange: jest.fn(),
    onStackedLayoutChange: jest.fn(),
    onRemove: jest.fn(),
    onMove: jest.fn(),
    ...overrides,
  };
  render(<CommandCenterWidgetGrid {...props} />);
  return props;
}

beforeEach(() => {
  mockContainerWidth.mockReturnValue({ width: 1200, mounted: true, containerRef: { current: null }, measureWidth: jest.fn() });
});

describe("CommandCenterWidgetGrid", () => {
  it("renders each placed widget's content in a grid item", () => {
    renderGrid();
    expect(screen.getByTestId("my-issues-content")).toBeInTheDocument();
    expect(screen.getByTestId("projects-content")).toBeInTheDocument();
    expect(screen.queryByTestId("risks-content")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".react-grid-item")).toHaveLength(2);
  });

  it("shows a skeleton grid until the container has been measured so the body is never blank", () => {
    mockContainerWidth.mockReturnValue({ width: 1280, mounted: false, containerRef: { current: null }, measureWidth: jest.fn() });
    renderGrid();
    expect(screen.queryByTestId("my-issues-content")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/loading widgets/i)).toBeInTheDocument();
  });

  it("keeps the skeleton when mounted at width 0 so GridLayout never paints a blank body", () => {
    mockContainerWidth.mockReturnValue({ width: 0, mounted: true, containerRef: { current: null }, measureWidth: jest.fn() });
    renderGrid();
    expect(screen.queryByTestId("my-issues-content")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/loading widgets/i)).toBeInTheDocument();
  });

  it("shows no edit controls outside edit mode — paired with the editing test below", () => {
    renderGrid();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    expect(document.querySelector(".react-grid-item")).toHaveClass("react-resizable-hide");
    expect(document.querySelector(".react-grid-item")).not.toHaveClass("react-draggable");
  });

  it("shows drag, resize, and remove controls in edit mode without a duplicate arrange menu", () => {
    const props = renderGrid({ editing: true });
    expect(screen.queryByRole("button", { name: "Arrange My issues" })).not.toBeInTheDocument();
    const moveButton = screen.getByRole("button", { name: "Move My issues widget" });
    expect(document.querySelector(".react-grid-item")).not.toHaveClass("react-resizable-hide");
    expect(document.querySelector(".react-grid-item")).toHaveClass("react-draggable");
    fireEvent.keyDown(moveButton, { key: "ArrowDown" });
    expect(props.onMove).toHaveBeenCalledWith("my-issues", 1);
    fireEvent.click(screen.getByRole("button", { name: "Remove Projects" }));
    expect(props.onRemove).toHaveBeenCalledWith("projects");
  });

  it("keeps drag and keyboard ordering available on narrow screens while disabling resize", () => {
    mockContainerWidth.mockReturnValue({ width: 500, mounted: true, containerRef: { current: null }, measureWidth: jest.fn() });
    renderGrid({ editing: true });
    expect(screen.getByRole("button", { name: "Move Projects widget" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Projects" })).toBeInTheDocument();
    expect(document.querySelector(".react-grid-item")).toHaveClass("react-resizable-hide");
    expect(document.querySelector(".react-grid-item")).toHaveClass("react-draggable");
  });

  it("keeps the summary in one row on compact phones so its cards scroll horizontally", () => {
    mockContainerWidth.mockReturnValue({ width: 288, mounted: true, containerRef: { current: null }, measureWidth: jest.fn() });
    renderGrid({
      widgets: [
        { type: "overview", position: { col: 0, row: 0, w: 12, h: 1 } },
        { type: "my-issues", position: { col: 0, row: 1, w: 7, h: 6 } },
      ],
    });
    const [overview, issues] = document.querySelectorAll<HTMLElement>(".react-grid-item");
    expect(overview?.style.height).toBe("64px");
    expect(issues?.style.transform).toContain("80px");
  });

  it("does not reserve an empty summary row when three cards fit on a tablet", () => {
    mockContainerWidth.mockReturnValue({ width: 700, mounted: true, containerRef: { current: null }, measureWidth: jest.fn() });
    renderGrid({
      widgets: [
        { type: "overview", position: { col: 0, row: 0, w: 12, h: 1 } },
        { type: "my-issues", position: { col: 0, row: 1, w: 7, h: 6 } },
      ],
    });
    const [overview, issues] = document.querySelectorAll<HTMLElement>(".react-grid-item");
    expect(overview?.style.height).toBe("64px");
    expect(issues?.style.transform).toContain("80px");
  });
});

describe("CommandCenterLayoutControls", () => {
  function renderControls() {
    const props = {
      onDone: jest.fn(),
      onReset: jest.fn(),
      availableTypes: ["my-issues", "projects", "risks"] satisfies WidgetType[],
      placedTypes: new Set<WidgetType>(["my-issues"]),
      onAdd: jest.fn(),
    };
    render(<CommandCenterLayoutControls {...props} />);
    return props;
  }

  it("lists every permitted widget, marks placed ones as added, and adds an unplaced one", () => {
    const props = renderControls();
    fireEvent.click(screen.getByRole("button", { name: /add widget/i }));
    const placed = screen.getByRole("button", { name: /my issues/i });
    expect(placed).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /risks/i }));
    expect(props.onAdd).toHaveBeenCalledWith("risks");
  });

  it("asks for confirmation before resetting the layout", () => {
    const props = renderControls();
    fireEvent.click(screen.getByRole("button", { name: /reset command center/i }));
    expect(props.onReset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /reset layout/i }));
    expect(props.onReset).toHaveBeenCalled();
  });

  it("finishes editing from the Done action", () => {
    const props = renderControls();
    fireEvent.click(screen.getByRole("button", { name: /finish customizing/i }));
    expect(props.onDone).toHaveBeenCalled();
  });
});
