import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { Approval } from "@/types/projects";
import { useApprovalsColumns } from "./use-approvals-columns";
let membershipId: number | null = 22;
jest.mock("@/hooks/api/access", () => ({ useAccess: () => ({ data: { membershipId } }) }));
beforeEach(() => { membershipId = 22; });

jest.mock("./approvals-toolbar", () => ({
  ApprovalActions: ({ canDecideRow, onDecide }: { canDecideRow: boolean; onDecide: () => void }) =>
    canDecideRow ? <button onClick={onDecide}>Decide</button> : null,
}));

const approval: Approval = {
  id: 1,
  revision: 1,
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

it.each([true, false])("permits an assigned decider on changes_requested without management standing %s", (canManage) => {
  const { result } = renderHook(() => useApprovalsColumns({ canDecide: true, canManage,
    memberName: () => "Assigned", setDecideTarget: jest.fn(), setDelegateTarget: jest.fn(), handleEscalate: jest.fn(), setCancelTarget: jest.fn(), setDeleteTarget: jest.fn() }));
  render(<>{result.current.find((column) => column.key === "actions")?.cell?.({ ...approval, status: "changes_requested" })}</>);
  expect(screen.getByRole("button", { name: "Decide" })).toBeInTheDocument();
});
it("does not offer a requested decision even to a managing decider", () => {
  const { result } = renderHook(() => useApprovalsColumns({ canDecide: true, canManage: true,
    memberName: () => "Assigned", setDecideTarget: jest.fn(), setDelegateTarget: jest.fn(), handleEscalate: jest.fn(), setCancelTarget: jest.fn(), setDeleteTarget: jest.fn() }));
  render(<>{result.current.find((column) => column.key === "actions")?.cell?.({ ...approval, status: "requested" })}</>);
  expect(screen.queryByRole("button", { name: "Decide" })).not.toBeInTheDocument();
});
it("does not offer an unrelated own-scope decision without management standing", () => {
  membershipId = 23;
  const { result } = renderHook(() => useApprovalsColumns({ canDecide: true, canManage: false,
    memberName: () => "Other", setDecideTarget: jest.fn(), setDelegateTarget: jest.fn(), handleEscalate: jest.fn(), setCancelTarget: jest.fn(), setDeleteTarget: jest.fn() }));
  render(<>{result.current.find((column) => column.key === "actions")?.cell?.(approval)}</>);
  expect(screen.queryByRole("button", { name: "Decide" })).not.toBeInTheDocument();
});

it("retains requested management actions while refusing a decision", async () => {
  const { ApprovalActions } = jest.requireActual<typeof import("./approvals-toolbar")>("./approvals-toolbar");
  render(<ApprovalActions canDecideRow={false} canManage status="requested" onDecide={jest.fn()}
    onDelegate={jest.fn()} onEscalate={jest.fn()} onCancel={jest.fn()} onDelete={jest.fn()} />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Approval actions" }), { key: "ArrowDown" });
  expect(await screen.findByRole("menuitem", { name: "Delegate" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Cancel" })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Decide" })).not.toBeInTheDocument();
});
