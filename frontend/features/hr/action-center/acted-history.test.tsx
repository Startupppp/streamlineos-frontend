import { render, screen } from "@testing-library/react";
import { ActedHistory } from "./acted-history";

const workflowActed = jest.fn();
const leaveApprovals = jest.fn();

jest.mock("@/hooks/api/hr/hr-workflows", () => ({
  useWorkflowActed: () => workflowActed(),
}));

jest.mock("@/hooks/api/hr/leaves", () => ({
  useHrLeaveApprovals: (params: unknown) => leaveApprovals(params),
}));

const emptyWorkflow = {
  data: { data: [], pagination: { hasMore: false, nextCursor: null } },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
  access: { denied: false },
};

function leavePage(rows: unknown[]) {
  return {
    data: { pages: [{ data: rows, pageInfo: { limit: 20, hasMore: false, nextCursor: null } }] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  };
}

const rejected = {
  id: 9,
  status: "REJECTED",
  updatedAt: "2026-10-14T09:00:00.000Z",
  leaveType: { id: 1, name: "Casual Leave" },
  user: { id: "u2", name: "Asha Rao", firstName: "Asha", lastName: "Rao", image: null },
};

beforeEach(() => {
  workflowActed.mockReturnValue(emptyWorkflow);
  leaveApprovals.mockReturnValue(leavePage([]));
});

describe("ActedHistory (QA 2026-10-14: a rejected leave never showed under Acted)", () => {
  it("asks the leave list for the caller's own decisions", () => {
    render(<ActedHistory enabled onOpenInstance={jest.fn()} />);
    expect(leaveApprovals).toHaveBeenCalledWith(
      expect.objectContaining({ decidedBy: "me", enabled: true }),
    );
  });

  it("lists a leave the caller rejected even when no workflow was acted on", () => {
    leaveApprovals.mockReturnValue(leavePage([rejected]));
    render(<ActedHistory enabled onOpenInstance={jest.fn()} />);

    expect(screen.getByText(/Casual Leave · Rejected/)).toBeInTheDocument();
    expect(screen.getByText(/Asha Rao/)).toBeInTheDocument();
    expect(screen.queryByText("No actions yet")).toBeNull();
  });

  it("still says No actions yet when neither source has a decision", () => {
    render(<ActedHistory enabled onOpenInstance={jest.fn()} />);
    expect(screen.getByText("No actions yet")).toBeInTheDocument();
  });

  it("shows leave decisions to an approver without workflow access instead of a denial", () => {
    workflowActed.mockReturnValue({ ...emptyWorkflow, data: undefined, access: { denied: true } });
    leaveApprovals.mockReturnValue(leavePage([rejected]));
    render(<ActedHistory enabled onOpenInstance={jest.fn()} />);

    expect(screen.getByText(/Casual Leave · Rejected/)).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).toBeNull();
  });
});
