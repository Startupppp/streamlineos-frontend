import { render, screen } from "@testing-library/react";
import { KanbanColumnHeader } from "./kanban-column-header";
import type { KanbanColumn } from "../shared/types";

const mutate = jest.fn();

jest.mock("@/hooks/api/build/custom-states", () => ({
  useUpdateCustomState: () => ({ mutate, isPending: false }),
  useDeleteCustomState: () => ({ mutate, isPending: false }),
}));

const column: KanbanColumn = {
  id: "IN_PROGRESS",
  statusId: 7,
  name: "In Progress",
  color: "#3b82f6",
  order: 1,
};

const noop = () => undefined;

function renderHeader(props: { ticketCount: number; serverCount?: number; wipLimit?: number | null }) {
  return render(
    <KanbanColumnHeader
      column={column}
      projectId={1}
      canManage={false}
      onRename={noop}
      onColorChange={noop}
      {...props}
    />,
  );
}

describe("KanbanColumnHeader", () => {
  it("surfaces the WIP limit beside the column name, which today the user only meets as an error toast", () => {
    renderHeader({ ticketCount: 5, wipLimit: 5 });

    expect(
      screen.getByLabelText("5 of 5 tickets, at the work-in-progress limit"),
    ).toHaveTextContent("5/5");
  });

  it("shows a plain count when the status has no WIP limit, so the badge only appears when it means something", () => {
    renderHeader({ ticketCount: 4, wipLimit: null });

    expect(screen.getByLabelText("4 tickets")).toHaveTextContent("4");
  });

  it("measures the limit against the server aggregate, not the rows this column happens to have rendered", () => {
    renderHeader({ ticketCount: 15, serverCount: 42, wipLimit: 20 });

    expect(
      screen.getByLabelText("42 of 20 tickets, over the work-in-progress limit"),
    ).toHaveTextContent("42/20");
  });

  it("keeps an explicit zero from falling back to the loaded row count", () => {
    renderHeader({ ticketCount: 15, serverCount: 0, wipLimit: null });

    expect(screen.getByLabelText("0 tickets")).toHaveTextContent("0");
  });
});
