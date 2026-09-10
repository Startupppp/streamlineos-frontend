import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAccess, usePermissionGate } from "@/hooks/api/access";
import { useApprovals } from "@/hooks/api/timesheets-core/approvals";
import { useHrEmployees } from "@/hooks/api/hr";
import type { TimesheetPeriod } from "@/features/timesheets/types";
import { ApprovalsView } from "./approvals-view";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: { user: { id: "usr_me" }, orgId: "org_1" } })),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { isOrgOwner: false, scopes: {} } })),
  useCan: jest.fn(() => true),
  useScope: jest.fn(() => "all"),
  useModuleEnabled: jest.fn(() => true),
  usePermissionGate: jest.fn(),
}));

jest.mock("@/hooks/api/timesheets-core/approvals", () => ({
  APPROVALS_PAGE_SIZE: 25,
  useApprovals: jest.fn(),
  useBulkApprove: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useBulkReject: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrEmployees: jest.fn(() => ({ data: [] })),
  unwrapEmployees: (raw: unknown) => (Array.isArray(raw) ? raw : []),
}));

const openedPeriods: (TimesheetPeriod | null)[] = [];

jest.mock("./approval-detail-sheet", () => ({
  ApprovalDetailSheet: ({ period, open }: { period: TimesheetPeriod | null; open: boolean }) => {
    if (open) openedPeriods.push(period);
    return null;
  },
}));

const session = useSession as unknown as jest.Mock;
const access = useAccess as unknown as jest.Mock;
const gate = usePermissionGate as unknown as jest.Mock;
const approvals = useApprovals as unknown as jest.Mock;
const employees = useHrEmployees as unknown as jest.Mock;

function period(over: Partial<TimesheetPeriod>): TimesheetPeriod {
  return {
    id: 1,
    orgId: "org_1",
    userId: "usr_worker",
    periodStart: "2026-09-07",
    periodEnd: "2026-09-13",
    status: "SUBMITTED",
    totalHours: "40",
    billableHours: "32",
    nonBillableHours: "8",
    submittedAt: "2026-09-14T09:00:00.000Z",
    approvedAt: null,
    rejectedAt: null,
    lockedAt: null,
    currentApproverId: "usr_me",
    rejectionReason: null,
    createdAt: "2026-09-07T00:00:00.000Z",
    updatedAt: "2026-09-14T09:00:00.000Z",
    user: { id: "usr_worker", name: "Dana Wu", email: "dana@example.com" },
    ...over,
  };
}

const ROWS = [
  period({ id: 1 }),
  period({
    id: 2,
    userId: "usr_other",
    user: { id: "usr_other", name: "Sam Ray", email: "sam@example.com" },
  }),
];

function renderApprovals(rows: TimesheetPeriod[] = ROWS) {
  approvals.mockReturnValue({
    data: { data: rows, pagination: { page: 1, limit: 25, total: rows.length } },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  return render(
    <TooltipProvider>
      <ApprovalsView />
    </TooltipProvider>,
  );
}

function selectedTab(): HTMLElement {
  const [tab] = screen
    .getAllByRole("tab")
    .filter((el) => el.getAttribute("aria-selected") === "true");
  if (!tab) throw new Error("no tab is selected");
  return tab;
}

beforeEach(() => {
  jest.clearAllMocks();
  openedPeriods.length = 0;
  session.mockReturnValue({ data: { user: { id: "usr_me" }, orgId: "org_1" } });
  access.mockReturnValue({ data: { isOrgOwner: false, scopes: {} } });
  employees.mockReturnValue({ data: [] });
  gate.mockReturnValue({
    permission: "timesheets:approvals:view",
    allowed: true,
    denied: false,
    pending: false,
  });
});

describe("approvals accessibility", () => {
  it("names every column of the queue as a real header cell", () => {
    renderApprovals();

    for (const name of ["Member", "Period", "Hours", "Billable", "Submitted", "Status"])
      expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
  });

  it("names each queue row by the person whose timesheet it is", () => {
    renderApprovals();

    expect(screen.getByRole("row", { name: /Dana Wu/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Sam Ray/ })).toBeInTheDocument();
  });

  it("opens a row from the keyboard instead of requiring a mouse", async () => {
    const user = userEvent.setup();
    renderApprovals();

    const row = screen.getByRole("row", { name: /Sam Ray/ });
    expect(row).toHaveAttribute("tabindex", "0");

    row.focus();
    expect(row).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(openedPeriods.at(-1)?.id).toBe(2);
  });

  it("gives every row a named selection control, and says what a selection now offers", async () => {
    const user = userEvent.setup();
    renderApprovals();

    expect(screen.getByRole("checkbox", { name: "Select all" })).toBeInTheDocument();
    const rowBoxes = screen.getAllByRole("checkbox", { name: "Select row" });
    expect(rowBoxes).toHaveLength(ROWS.length);

    const [first] = rowBoxes;
    if (!first) throw new Error("no row checkbox");
    await user.click(first);

    /**
     * Re-queried: the toolbar appearing remounts the table, so the node
     * captured before the click is detached and answers for nothing.
     */
    expect(screen.getAllByRole("checkbox", { name: "Select row" })[0]).toBeChecked();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("selects a row without also opening it", async () => {
    const user = userEvent.setup();
    renderApprovals();

    const [first] = screen.getAllByRole("checkbox", { name: "Select row" });
    if (!first) throw new Error("no row checkbox");
    await user.click(first);

    expect(openedPeriods).toHaveLength(0);
  });

  it("points the status tabs at a panel that actually exists", () => {
    renderApprovals();

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    for (const tab of tabs) {
      const controls = tab.getAttribute("aria-controls");
      expect(controls).toBeTruthy();
      expect(document.getElementById(controls as string)).not.toBeNull();
    }
  });

  it("labels the panel with the tab that is currently selected", async () => {
    const user = userEvent.setup();
    renderApprovals();

    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(selectedTab().id);
    expect(selectedTab()).toHaveAccessibleName("Pending");

    await user.click(screen.getByRole("tab", { name: "Approved" }));

    expect(selectedTab()).toHaveAccessibleName("Approved");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
      selectedTab().id,
    );
  });

  it("names the filters that narrow the queue", () => {
    renderApprovals();

    expect(screen.getByRole("combobox", { name: "Member" })).toBeInTheDocument();
  });

  it("offers no bulk decision until something is selected", () => {
    renderApprovals();

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("says access is restricted rather than showing a permanently empty queue", () => {
    gate.mockReturnValue({
      permission: "timesheets:approvals:view",
      allowed: false,
      denied: true,
      pending: false,
    });
    renderApprovals();

    const denial = screen.getByRole("status");
    expect(
      within(denial).getByRole("heading", { name: /access restricted/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says which queue is empty rather than showing a headerless blank", async () => {
    const user = userEvent.setup();
    renderApprovals([]);

    expect(
      screen.getByRole("heading", { name: "No timesheets" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No timesheets awaiting approval.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Rejected" }));

    expect(
      screen.getByText("No rejected timesheets for this period."),
    ).toBeInTheDocument();
  });
});
