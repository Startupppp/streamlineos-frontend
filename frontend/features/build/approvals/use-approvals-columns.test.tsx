import { render, renderHook, screen } from "@testing-library/react";
import type { Approval } from "@/types/projects";
import { useApprovalsColumns } from "./use-approvals-columns";

jest.mock("./approvals-toolbar", () => ({
  ApprovalActions: () => null,
}));

const approval: Approval = {
  id: 1,
  orgId: "org-1",
  projectId: 1,
  entityType: "task",
  entityId: 10,
  title: "Approve deployment",
  reason: null,
  requestedById: "requester-user",
  approverMembershipId: 22,
  status: "pending",
  level: 1,
  dueAt: null,
  decisionComment: null,
  decidedAt: null,
  createdBy: "requester-user",
  deletedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

it("resolves the Approver column from approverMembershipId rather than requestedById", () => {
  const memberName = jest.fn((identifier: string | number | null) => {
    if (identifier === 22) return "Assigned Approver";
    if (identifier === "requester-user") return "Requester";
    return "Unknown";
  });
  const { result } = renderHook(() =>
    useApprovalsColumns({
      canDecide: false,
      canManage: false,
      memberName,
      setDecideTarget: jest.fn(),
      setDelegateTarget: jest.fn(),
      handleEscalate: jest.fn(),
      setCancelTarget: jest.fn(),
      setDeleteTarget: jest.fn(),
    }),
  );
  const approverColumn = result.current.find((column) => column.key === "approver");

  render(<>{approverColumn?.cell?.(approval)}</>);

  expect(screen.getByText("Assigned Approver")).toBeInTheDocument();
  expect(screen.queryByText("Requester")).not.toBeInTheDocument();
  expect(memberName).toHaveBeenCalledWith(22);
});
