/**
 * HRMS-E2E-013. `/hr/approvals` said "No pending approvals. You are all caught
 * up." while Leave > Approvals listed pending requests in the same organisation
 * and the Leave nav badge showed a non-zero count beside it.
 *
 * The page was reading the durable workflow engine's inbox. A leave request is
 * not a workflow instance — different table, different permission key — so the
 * queue named in the member's own routing text ("Routed to the HR approvals
 * queue") was the one screen that could not show it.
 *
 * These assertions pin both halves: the requests appear, and the page stops
 * claiming an empty queue while they do.
 */
import { render, screen } from "@testing-library/react";
import { PendingLeaveApprovals } from "./pending-leave-approvals";
import { formatDateRange } from "./leave-approval-row-format";

const useHrLeaveApprovals = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useHrLeaveApprovals: (...args: unknown[]) => useHrLeaveApprovals(...args),
}));

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: 41,
    startDate: "2026-10-05",
    endDate: "2026-10-06",
    isHalfDay: false,
    status: "PENDING",
    leaveType: { id: 1, name: "Casual Leave" },
    user: {
      id: "usr-member",
      name: "QA RoleMember",
      firstName: "QA",
      lastName: "RoleMember",
      image: null,
    },
    ...overrides,
  };
}

function withPages(rows: unknown[]) {
  useHrLeaveApprovals.mockReturnValue({
    data: { pages: [{ data: rows, pageInfo: { limit: 50, hasMore: false, nextCursor: null } }] },
    isLoading: false,
    isError: false,
  });
}

beforeEach(() => useHrLeaveApprovals.mockReset());

describe("PendingLeaveApprovals", () => {
  it("asks only for pending requests", () => {
    withPages([]);
    render(<PendingLeaveApprovals />);

    expect(useHrLeaveApprovals).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PENDING" }),
    );
  });

  it("lists a pending request by the person who filed it", () => {
    withPages([request()]);
    render(<PendingLeaveApprovals />);

    expect(screen.getByText("QA RoleMember")).toBeInTheDocument();
    expect(screen.getByText(/Casual Leave/)).toBeInTheDocument();
    expect(screen.getByText(/Oct 5 – Oct 6/)).toBeInTheDocument();
  });

  it("links each row to the surface that can act on it", () => {
    withPages([request()]);
    render(<PendingLeaveApprovals />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/hr/leaves");
  });

  it("renders nothing at all when there is no pending leave", () => {
    // The paired negative. Without it, a component that always rendered a header
    // would pass the positive case and put an empty section on every page.
    withPages([]);
    const { container } = render(<PendingLeaveApprovals />);

    expect(container).toBeEmptyDOMElement();
  });

  it("stays silent when the leave read fails, rather than breaking the workflow list beside it", () => {
    useHrLeaveApprovals.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { container } = render(<PendingLeaveApprovals />);

    expect(container).toBeEmptyDOMElement();
  });

  it("counts every page, not just the first", () => {
    useHrLeaveApprovals.mockReturnValue({
      data: {
        pages: [
          { data: [request({ id: 1 })], pageInfo: { limit: 1, hasMore: true, nextCursor: 1 } },
          { data: [request({ id: 2, user: { id: "u2", name: "QA RoleMemberTwo", firstName: null, lastName: null, image: null } })], pageInfo: { limit: 1, hasMore: false, nextCursor: null } },
        ],
      },
      isLoading: false,
      isError: false,
    });
    render(<PendingLeaveApprovals />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByText("QA RoleMemberTwo")).toBeInTheDocument();
  });
});

describe("formatDateRange", () => {
  it("reads a multi-day request as a range", () => {
    expect(formatDateRange("2026-10-05", "2026-10-06")).toBe("Oct 5 – Oct 6");
  });

  it("does not turn a single day into a range", () => {
    expect(formatDateRange("2026-10-07", "2026-10-07")).toBe("Oct 7");
  });

  it("returns the raw value rather than throwing inside a list of good rows", () => {
    expect(formatDateRange("not-a-date", "2026-10-06")).toBe("not-a-date");
  });
});
