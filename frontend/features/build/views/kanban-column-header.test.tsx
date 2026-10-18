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

function renderHeader(props: { ticketCount: number; serverCount?: number | null; wipLimit?: number | null }) {
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

  it("shows no count while the server aggregate is still loading, so a reload never shows how many rows the infinite board happened to page in", () => {
    renderHeader({ ticketCount: 67, serverCount: null, wipLimit: null });

    expect(screen.queryByLabelText("67 tickets")).not.toBeInTheDocument();
    expect(screen.queryByText("67")).not.toBeInTheDocument();
  });

  it("shows the server aggregate once it arrives, whatever the loaded row count", () => {
    renderHeader({ ticketCount: 67, serverCount: 76, wipLimit: null });

    expect(screen.getByLabelText("76 tickets")).toHaveTextContent("76");
  });
});
