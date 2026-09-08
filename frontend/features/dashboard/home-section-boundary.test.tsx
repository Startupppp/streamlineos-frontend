import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { HomeSectionBoundary } from "./home-section-boundary";

function Exploding(): never {
  throw new Error("section blew up");
}

function Fine() {
  return <p>healthy section content</p>;
}

describe("a failing Home section is contained", () => {
  const consoleError = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  afterAll(() => consoleError.mockRestore());

  it("renders its child when nothing throws", () => {
    render(
      <HomeSectionBoundary sectionLabel="Payroll">
        <Fine />
      </HomeSectionBoundary>,
    );
    expect(screen.getByText("healthy section content")).toBeInTheDocument();
  });

  it("replaces only the failing section and names it", () => {
    render(
      <HomeSectionBoundary sectionLabel="Payroll">
        <Exploding />
      </HomeSectionBoundary>,
    );
    expect(screen.getByText("Payroll is unavailable")).toBeInTheDocument();
  });

  it("keeps a sibling section rendering when its neighbour throws", () => {
    render(
      <div>
        <HomeSectionBoundary sectionLabel="Payroll">
          <Exploding />
        </HomeSectionBoundary>
        <HomeSectionBoundary sectionLabel="Expenses">
          <Fine />
        </HomeSectionBoundary>
      </div>,
    );
    expect(screen.getByText("Payroll is unavailable")).toBeInTheDocument();
    expect(screen.getByText("healthy section content")).toBeInTheDocument();
  });

  it("never leaks the underlying error text to the user", () => {
    render(
      <HomeSectionBoundary sectionLabel="Payroll">
        <Exploding />
      </HomeSectionBoundary>,
    );
    expect(screen.queryByText(/section blew up/)).not.toBeInTheDocument();
  });
});

describe("every Home widget is individually contained", () => {
  const source = ["dashboard-client.tsx", "dashboard-deferred-body.tsx", "home-widget-grid.tsx"]
    .map((file) =>
      readFileSync(
        resolve(process.cwd(), "features", "dashboard", file),
        "utf8",
      ),
    )
    .join("\n");

  const WIDGETS = [
    "MyTasksWidget",
    "TimesheetWidget",
    "LeaveBalanceWidget",
    "AlertsWidget",
    "AnnouncementsWidget",
    "UpcomingEventsWidget",
    "BusinessPulseWidget",
    "MyAttendanceWidget",
    "PayrollWidget",
    "LeavesTodayWidget",
    "TeamAttendanceWidget",
    "PendingApprovalsWidget",
    "BirthdaysWidget",
    "UpcomingHolidaysWidget",
    "MyIssuesCard",
    "SprintCard",
    "RecentProjectsCard",
    "RecentActivityCard",
    "TeamCard",
  ];

  /**
   * Two Home widgets are owned by the HR feature and reach Home as slots the
   * route fills, because `features/dashboard` may not import `features/hr`
   * (root §9). The containment invariant is unchanged — the slot's mount point
   * is what has to sit inside a boundary — and the route wiring is pinned below
   * so the indirection cannot be where a widget goes missing.
   */
  const SLOT_WIDGETS = [
    { component: "ExpensesWidget", slot: "expensesSlot" },
    { component: "PublicDocumentsCard", slot: "publicDocumentsSlot" },
  ];

  /**
   * A slot is matched where it is RENDERED — on its own line as a JSX child —
   * not where it is forwarded as `expensesSlot={expensesSlot}`, which is a
   * prop hand-off and carries no boundary of its own.
   */
  const MOUNT_POINTS = [
    ...WIDGETS.map((widget) => ({
      label: widget,
      pattern: new RegExp(`<${widget}\\b`),
    })),
    ...SLOT_WIDGETS.map((widget) => ({
      label: widget.component,
      pattern: new RegExp(`^[ \\t]*\\{${widget.slot}\\}[ \\t]*$`, "m"),
    })),
  ];

  it("reads the Home composition files", () => {
    expect(source).toContain("HomeSectionBoundary");
  });

  it("finds every widget it claims to check, so a moved widget cannot go unchecked", () => {
    const missing = MOUNT_POINTS.filter(
      (mount) => source.search(mount.pattern) < 0,
    ).map((mount) => mount.label);
    expect(missing).toEqual([]);
  });

  it("wraps each rendered widget in its own boundary", () => {
    const unwrapped = MOUNT_POINTS.filter((mount) => {
      const index = source.search(mount.pattern);
      if (index < 0) return true;
      return !source
        .slice(Math.max(0, index - 400), index)
        .includes("HomeSectionBoundary");
    }).map((mount) => mount.label);
    expect(unwrapped).toEqual([]);
  });

  it("the route fills those slots with the real HR widgets", () => {
    const routeSource = readFileSync(
      resolve(process.cwd(), "app", "(authenticated)", "dashboard", "page.tsx"),
      "utf8",
    );
    for (const widget of SLOT_WIDGETS) {
      expect(routeSource).toContain(`import { ${widget.component} } from "@/features/hr/`);
      expect(routeSource).toContain(`${widget.slot}={<${widget.component} />}`);
    }
  });

  it("does not mount RecruitmentWidget on Home (module destination, not universal work)", () => {
    expect(source).not.toContain("<RecruitmentWidget");
  });

  it("keeps payroll administration off Home while preserving payroll self-service", () => {
    const payrollWidget = readFileSync(
      resolve(__dirname, "payroll-widget.tsx"),
      "utf8",
    );
    expect(payrollWidget).not.toContain("useCommandCenter");
    expect(payrollWidget).not.toContain("/payroll/runs");
    expect(payrollWidget).toContain("PayrollSelfCard");
    expect(payrollWidget).toContain("/me/pay");
  });
});
