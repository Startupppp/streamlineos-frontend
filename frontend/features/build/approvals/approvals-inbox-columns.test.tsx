import { fireEvent, render, screen } from "@testing-library/react";
import type { ApprovalInboxItem } from "@/types/projects";
import { ApprovalsInboxMobileCard } from "./approvals-inbox-columns";

const row: ApprovalInboxItem = {
  id: 7,
  revision: 1,
  projectId: 42,
  projectKey: "WEB",
  entityType: "task",
  entityId: 9,
  title: "Approve launch checklist",
  status: "pending",
  requestedById: "user-1",
  dueAt: null,
  createdAt: "2026-10-09T00:00:00.000Z",
};

describe("ApprovalsInboxMobileCard", () => {
  it("keeps the primary decision action available in the responsive card", () => {
    const onDecide = jest.fn();
    render(
      <ApprovalsInboxMobileCard
        row={row}
        ownerOf={() => null}
        onDecide={onDecide}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Decide" }));
    expect(onDecide).toHaveBeenCalledWith(row);
  });

  it("does not offer a decision for a terminal approval", () => {
    render(
      <ApprovalsInboxMobileCard
        row={{ ...row, status: "approved" }}
        ownerOf={() => null}
        onDecide={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Decide" })).not.toBeInTheDocument();
  });
});
