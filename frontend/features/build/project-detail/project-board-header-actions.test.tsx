import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const execute = jest.fn();
const handleOpenChange = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) =>
    key === "build:ai:use" ||
    key === "build:tickets:create" ||
    key === "build:tickets:view",
}));

jest.mock("@/features/build/tickets/create-ticket-dialog", () => ({
  CreateTicketDialog: () => null,
}));

jest.mock("@/features/build/import-export/components/ticket-import-export-dialog", () => ({
  TicketImportExportDialog: () => null,
}));

jest.mock("@/features/build/shared/build-header-actions", () => ({
  BuildHeaderActions: ({
    actions,
  }: {
    actions: Array<{ id: string; label: string; onSelect?: () => void }>;
  }) => (
    <div>
      {actions.map((action) =>
        action.onSelect ? (
          <button key={action.id} type="button" onClick={action.onSelect}>
            {action.label}
          </button>
        ) : (
          <span key={action.id}>{action.label}</span>
        ),
      )}
    </div>
  ),
}));

jest.mock("@/features/build/ai/project-ai-menu", () => ({
  ProjectAiMenu: ({
    onRunRegister,
  }: {
    onRunRegister?: (run: (() => void) | null) => void;
  }) => {
    const React = require("react") as typeof import("react");
    React.useEffect(() => {
      onRunRegister?.(() => {
        execute();
      });
      return () => onRunRegister?.(null);
    }, [onRunRegister]);
    return <div data-testid="project-ai-menu" />;
  },
}));

import { ProjectBoardHeaderActions } from "./project-board-header-actions";

describe("ProjectBoardHeaderActions — AI summarize registration", () => {
  it("does not open or run summarize while registering the callback during mount", async () => {
    render(
      <ProjectBoardHeaderActions
        projectId={29}
        createOpen={false}
        onCreateOpenChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("project-ai-menu")).toBeInTheDocument();
    });

    expect(execute).not.toHaveBeenCalled();
  });

  it("runs summarize only when the Summarize action is chosen", async () => {
    render(
      <ProjectBoardHeaderActions
        projectId={29}
        createOpen={false}
        onCreateOpenChange={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Summarize" }));
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
