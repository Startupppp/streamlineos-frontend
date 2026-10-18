import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport } from "@/test-utils/viewport";

jest.mock("@animateicons/react/lucide", () => ({
  ChevronLeftIcon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" data-testid="chevron-left" {...rest} />
  ),
  ChevronRightIcon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" data-testid="chevron-right" {...rest} />
  ),
  EllipsisIcon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
  PlusIcon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    "aria-label": ariaLabel,
    variant: _v,
    size: _s,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button type="button" onClick={onClick} className={className} aria-label={ariaLabel} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    "aria-label": ariaLabel,
    onClick,
    className,
    variant: _v,
    size: _s,
    icon: _icon,
    iconSize: _is,
    iconClassName: _ic,
  }: {
    children?: React.ReactNode;
    "aria-label"?: string;
    onClick?: () => void;
    className?: string;
    variant?: string;
    size?: string;
    icon?: unknown;
    iconSize?: number;
    iconClassName?: string;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className={className}>
      {children ?? <svg aria-hidden="true" />}
    </button>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value: _v, onValueChange: _ovc }: React.PropsWithChildren<{ value?: string; onValueChange?: (v: string) => void }>) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <button type="button" className={className}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? "Value"}</span>,
  SelectContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectItem: ({ children, value: _v }: React.PropsWithChildren<{ value: string }>) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: React.PropsWithChildren<{ asChild?: boolean }>) =>
    asChild ? <>{children}</> : <div>{children}</div>,
  DropdownMenuContent: ({ children }: React.PropsWithChildren<{ align?: string; className?: string }>) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: React.PropsWithChildren<{ onClick?: () => void; className?: string }>) => (
    <button type="button" onClick={onClick} className={className}>{children}</button>
  ),
  DropdownMenuCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
    className,
  }: React.PropsWithChildren<{ checked?: boolean; onCheckedChange?: (v: boolean) => void; className?: string }>) => (
    <div className={className}>
      <input type="checkbox" aria-label={typeof children === "string" ? children : "Toggle"} checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} readOnly={onCheckedChange === undefined} />
      <span>{children}</span>
    </div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuSub: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <button type="button" className={className}>{children}</button>
  ),
  DropdownMenuSubContent: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  FILTER_SELECT_TRIGGER: "filter-trigger-class",
}));

jest.mock("@/features/calendar/calendar-source-panel", () => ({
  CalendarSourcePanel: ({ failures: _f }: { failures?: Array<{ key: string; label: string }> }) => (
    <button type="button" aria-label="Calendar sources">Sources</button>
  ),
  SourceFailureBanner: ({
    failures,
  }: {
    failures: ReadonlyArray<{ key: string; label: string }>;
  }) =>
    failures.length === 0 ? null : (
      <div role="status">{failures.map((f) => f.label).join(", ")}</div>
    ),
}));

jest.mock("@/features/calendar/big-calendar-wrapper", () => ({}));

import { CalendarToolbar } from "@/features/calendar/calendar-toolbar";

type CalendarView = "month" | "week" | "day" | "agenda";
type CalendarViewMode = "calendar" | "list" | "history";

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    view: "month" as CalendarView,
    viewMode: "calendar" as CalendarViewMode,
    hrEventsVisible: false,
    crmEventsVisible: false,
    attendanceEventsVisible: false,
    isHrEnabled: false,
    isCrmEnabled: false,
    isAttendanceEnabled: true,
    sourceFailures: [],
    onPrev: jest.fn(),
    onNext: jest.fn(),
    onToday: jest.fn(),
    onViewChange: jest.fn(),
    onViewModeChange: jest.fn(),
    onOpenCreate: jest.fn(),
    onToggleHrEvents: jest.fn(),
    onToggleCrmEvents: jest.fn(),
    onToggleAttendanceEvents: jest.fn(),
    ...overrides,
  };
}

describe("a11y — Calendar surface (CalendarToolbar)", () => {
  it("passes axe at desktop (1280px)", async () => {
    const restore = atViewport("desktop");
    try {
      const { baseElement } = render(<CalendarToolbar {...makeProps()} />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("passes axe at 375px mobile", async () => {
    const restore = atViewport("mobile");
    try {
      const { baseElement } = render(<CalendarToolbar {...makeProps()} />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("passes axe at 768px tablet", async () => {
    const restore = atViewport("tablet");
    try {
      const { baseElement } = render(<CalendarToolbar {...makeProps()} />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("Previous navigation button has accessible label", () => {
    render(<CalendarToolbar {...makeProps()} />);
    expect(screen.getByRole("button", { name: /^Previous / })).toBeInTheDocument();
  });

  it("Next navigation button has accessible label", () => {
    render(<CalendarToolbar {...makeProps()} />);
    expect(screen.getByRole("button", { name: /^Next / })).toBeInTheDocument();
  });

  it("Today button is present and keyboard operable", () => {
    const onToday = jest.fn();
    render(<CalendarToolbar {...makeProps({ onToday })} />);
    const todayBtn = screen.getByRole("button", { name: /Today/i });
    expect(todayBtn).toBeInTheDocument();
    todayBtn.click();
    expect(onToday).toHaveBeenCalled();
  });

  it("view mode tablist is labelled and names a tab per mode", () => {
    render(<CalendarToolbar {...makeProps()} />);
    const tablist = screen.getByRole("tablist", { name: "Calendar modes" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Calendar View",
      "List View",
      "History",
      "My Day",
    ]);
    expect(within(tablist).getByRole("tab", { name: "Calendar View" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("BITE PROOF — no mode tab claims a tab panel it never renders", () => {
    render(<CalendarToolbar {...makeProps()} />);
    expect(screen.queryAllByRole("tabpanel")).toHaveLength(0);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).not.toHaveAttribute("aria-controls");
    }
  });

  it("selecting a mode tab reports the new view mode", () => {
    const onViewModeChange = jest.fn();
    render(<CalendarToolbar {...makeProps({ onViewModeChange })} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "History" }), { button: 0 });
    expect(onViewModeChange).toHaveBeenCalledWith("history");
  });

  it("attendance toggle button has aria-label describing current state", () => {
    render(<CalendarToolbar {...makeProps({ attendanceEventsVisible: false })} />);
    expect(screen.getByRole("button", { name: "Attendance events" })).toHaveAttribute("aria-pressed");
  });

  it("when attendance events visible, the toggle state flips but the name stays stable", () => {
    const { unmount } = render(
      <CalendarToolbar {...makeProps({ attendanceEventsVisible: true })} />,
    );
    expect(screen.getByRole("button", { name: "Attendance events" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    unmount();
    render(<CalendarToolbar {...makeProps({ attendanceEventsVisible: false })} />);
    expect(screen.getByRole("button", { name: "Attendance events" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("BITE PROOF (axe) — Previous button has aria-label", () => {
    render(<CalendarToolbar {...makeProps()} />);
    const prevBtn = screen.getByRole("button", { name: /^Previous / });
    expect(prevBtn.getAttribute("aria-label")).toMatch(/^Previous (day|week|month)$/);
  });

  it("BITE PROOF (viewport 375px) — Today and nav buttons visible at mobile", () => {
    const restore = atViewport("mobile");
    try {
      render(<CalendarToolbar {...makeProps()} />);
      expect(screen.getByRole("button", { name: /Today/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Previous / })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Next / })).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("hidePrimaryActions hides add button", () => {
    render(<CalendarToolbar {...makeProps({ hidePrimaryActions: true })} />);
    expect(screen.queryByRole("button", { name: /Add/i })).toBeNull();
  });
});
