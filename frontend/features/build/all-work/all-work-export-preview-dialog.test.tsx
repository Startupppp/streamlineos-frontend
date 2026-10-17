import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AllWorkTicket } from "@/types/projects";

const mockPreview = { projectId: 1, availableCount: 42, cappedAt: 5000, columns: ["ticketNumber", "title", "status"] };

jest.mock("@/hooks/api/build/ticket-import-export", () => ({
  useExportTicketsPreview: (projectId: number) => ({ data: projectId > 0 ? mockPreview : undefined, isLoading: false }),
  useExportTicketSelection: () => ({ mutate: jest.fn(), isPending: false }),
}));

import { AllWorkExportPreviewDialog } from "./all-work-export-preview-dialog";
import { EXPORT_SELECTION_LIMIT, groupSelectionByProject, type AllWorkExportGroup } from "./use-all-work-export";

function ticket(id: number, projectId: number, projectName: string): AllWorkTicket {
  return {
    id,
    title: `T${id}`,
    type: "TASK",
    status: "TODO",
    priority: null,
    projectId,
    projectKey: projectName.slice(0, 3).toUpperCase(),
    projectName,
    ticketNumber: id,
    epicId: null,
    assigneeId: null,
    points: null,
    estimate: null,
    rank: null,
    version: 1,
    startDate: null,
    dueDate: null,
    cycleId: null,
    createdAt: null,
    updatedAt: null,
    assignee: null,
    labels: [],
  };
}

function renderDialog(groups: AllWorkExportGroup[], onConfirm = jest.fn()) {
  render(
    <AllWorkExportPreviewDialog open onOpenChange={jest.fn()} groups={groups} isExporting={false} onConfirm={onConfirm} />,
  );
  return { onConfirm };
}

describe("groupSelectionByProject", () => {
  it("splits a cross-project selection into one group per project", () => {
    const tickets = [ticket(1, 10, "Alpha"), ticket(2, 20, "Beta"), ticket(3, 10, "Alpha")];
    expect(groupSelectionByProject(new Set([1, 2, 3]), tickets, undefined)).toEqual([
      { projectId: 10, label: "Alpha", ticketIds: [1, 3] },
      { projectId: 20, label: "Beta", ticketIds: [2] },
    ]);
  });

  it("places expanded-selection ids that are not on the loaded page using the ids snapshot", () => {
    const tickets = [ticket(1, 10, "Alpha")];
    const groups = groupSelectionByProject(new Set([1, 99]), tickets, [{ projectId: 10, ids: [1, 99] }]);
    expect(groups).toEqual([{ projectId: 10, label: "Alpha", ticketIds: [1, 99] }]);
  });

  it("drops selected ids whose project cannot be resolved", () => {
    expect(groupSelectionByProject(new Set([7]), [ticket(1, 10, "Alpha")], undefined)).toEqual([]);
  });
});

describe("AllWorkExportPreviewDialog", () => {
  it("lists each project with its selected count and the total", () => {
    renderDialog([
      { projectId: 10, label: "Alpha", ticketIds: [1, 3] },
      { projectId: 20, label: "Beta", ticketIds: [2] },
    ]);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows the columns the export will contain", () => {
    renderDialog([{ projectId: 10, label: "Alpha", ticketIds: [1] }]);
    expect(screen.getByText("ticketNumber")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
  });

  it("calls onConfirm when Export is clicked", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog([{ projectId: 10, label: "Alpha", ticketIds: [1] }]);
    await user.click(screen.getByRole("button", { name: /^export$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("blocks export and names the project when a project exceeds the selection limit", () => {
    const ids = Array.from({ length: EXPORT_SELECTION_LIMIT + 1 }, (_, i) => i + 1);
    renderDialog([{ projectId: 10, label: "Alpha", ticketIds: ids }]);
    expect(screen.getByRole("alert")).toHaveTextContent(/Alpha/);
    expect(screen.getByRole("button", { name: /^export$/i })).toBeDisabled();
  });

  it("disables export when nothing in the selection can be exported", () => {
    renderDialog([]);
    expect(screen.getByText(/none of the selected tickets/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^export$/i })).toBeDisabled();
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    render(
      <AllWorkExportPreviewDialog open onOpenChange={onOpenChange} groups={[]} isExporting={false} onConfirm={jest.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
