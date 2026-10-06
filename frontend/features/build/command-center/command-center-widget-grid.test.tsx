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
    onRemove: jest.fn(),
    onResize: jest.fn(),
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

  it("renders nothing until the container has been measured so widgets never flash at the wrong width", () => {
    mockContainerWidth.mockReturnValue({ width: 1280, mounted: false, containerRef: { current: null }, measureWidth: jest.fn() });
    renderGrid();
    expect(screen.queryByTestId("my-issues-content")).not.toBeInTheDocument();
  });

  it("shows no edit controls outside edit mode — paired with the editing test below", () => {
    renderGrid();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    expect(document.querySelector(".react-grid-item")).toHaveClass("react-resizable-hide");
    expect(document.querySelector(".react-grid-item")).not.toHaveClass("react-draggable");
  });

  it("shows remove, arrange and resize handles in edit mode and reports the removed widget", () => {
    const props = renderGrid({ editing: true });
    expect(screen.getByRole("button", { name: "Arrange My issues" })).toBeInTheDocument();
    expect(document.querySelector(".react-grid-item")).not.toHaveClass("react-resizable-hide");
    expect(document.querySelector(".react-grid-item")).toHaveClass("react-draggable");
    fireEvent.click(screen.getByRole("button", { name: "Remove Projects" }));
    expect(props.onRemove).toHaveBeenCalledWith("projects");
  });

  it("keeps widgets editable through their menu but disables dragging on a narrow screen", () => {
    mockContainerWidth.mockReturnValue({ width: 500, mounted: true, containerRef: { current: null }, measureWidth: jest.fn() });
    renderGrid({ editing: true });
    expect(screen.getByRole("button", { name: "Remove Projects" })).toBeInTheDocument();
    expect(document.querySelector(".react-grid-item")).toHaveClass("react-resizable-hide");
    expect(document.querySelector(".react-grid-item")).not.toHaveClass("react-draggable");
  });
});

describe("CommandCenterLayoutControls", () => {
  function renderControls(editing: boolean) {
    const props = {
      editing,
      onEditingChange: jest.fn(),
      onReset: jest.fn(),
      availableTypes: ["my-issues", "projects", "risks"] satisfies WidgetType[],
      placedTypes: new Set<WidgetType>(["my-issues"]),
      onAdd: jest.fn(),
    };
    render(<CommandCenterLayoutControls {...props} />);
    return props;
  }

  it("offers Customize outside edit mode", () => {
    const props = renderControls(false);
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));
    expect(props.onEditingChange).toHaveBeenCalledWith(true);
  });

  it("lists every permitted widget, marks placed ones as added, and adds an unplaced one", () => {
    const props = renderControls(true);
    fireEvent.click(screen.getByRole("button", { name: /add widget/i }));
    const placed = screen.getByRole("button", { name: /my issues/i });
    expect(placed).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /risks/i }));
    expect(props.onAdd).toHaveBeenCalledWith("risks");
  });

  it("asks for confirmation before resetting the layout", () => {
    const props = renderControls(true);
    fireEvent.click(screen.getByRole("button", { name: /^reset$/i }));
    expect(props.onReset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /reset layout/i }));
    expect(props.onReset).toHaveBeenCalled();
  });
});
