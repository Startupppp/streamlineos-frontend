import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockUseRegisterDirtyState = jest.fn();

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: (...args: unknown[]) =>
    mockUseRegisterDirtyState(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: () => ({ data: { data: [] }, isLoading: false }),
  useProjectLabels: () => ({ data: [] }),
  useProjectMembers: () => ({ data: [] }),
}));

jest.mock("@/hooks/api", () => ({
  useCreateTicket: () => ({ mutate: jest.fn(), isPending: false }),
  useAddAttachment: () => ({ mutateAsync: jest.fn() }),
  useProject: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build/advanced", () => ({
  useCycles: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/build/tickets", () => ({
  useAddLabelToTicket: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/api/build/ticket-related-links", () => ({
  useAddRelatedLink: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("@/features/build/ai/create-ticket-ai-menu", () => ({
  useCreateTicketAi: () => ({
    canUseAI: false,
    titleTrigger: { label: "", onClick: jest.fn() },
    descriptionTrigger: { label: "", onClick: jest.fn() },
    fieldsTrigger: { label: "", onClick: jest.fn() },
  }),
}));

jest.mock("./ticket-dialog-description-section", () => ({
  TicketDialogDescriptionSection: () => null,
}));

jest.mock("./ticket-dialog-footer", () => ({
  TicketDialogFooter: () => null,
}));

jest.mock("./ticket-create-properties", () => ({
  TicketCreateProperties: () => null,
}));

import { CreateTicketDialog } from "./create-ticket-dialog";

function renderDialog() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <CreateTicketDialog projectId={1} />
    </QueryClientProvider>,
  );
}

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: /create issue/i }));
}

describe("CreateTicketDialog registers with the shared dirty-state guard (BSN-04-A03), so a scope switch mid-draft prompts instead of silently discarding a typed ticket", () => {
  beforeEach(() => {
    mockUseRegisterDirtyState.mockClear();
  });

  it("registers not-dirty while the dialog is closed because there is no draft to protect yet", () => {
    renderDialog();
    expect(mockUseRegisterDirtyState).toHaveBeenLastCalledWith(false);
  });

  it("registers not-dirty immediately after opening an untouched form", () => {
    renderDialog();
    openDialog();
    expect(mockUseRegisterDirtyState).toHaveBeenLastCalledWith(false);
  });

  it("registers dirty once the title is typed, so a scope switch prompts rather than discarding the draft", async () => {
    renderDialog();
    openDialog();
    const titleInput = await screen.findByPlaceholderText("Issue title");
    fireEvent.change(titleInput, { target: { value: "New login flow" } });
    await waitFor(() => {
      expect(mockUseRegisterDirtyState).toHaveBeenLastCalledWith(true);
    });
  });

  it("registers not-dirty again once the dialog closes, because a closed dialog holds no draft the navigation guard must protect", async () => {
    renderDialog();
    openDialog();
    const titleInput = await screen.findByPlaceholderText("Issue title");
    fireEvent.change(titleInput, { target: { value: "New login flow" } });
    await waitFor(() => {
      expect(mockUseRegisterDirtyState).toHaveBeenLastCalledWith(true);
    });

    fireEvent.keyDown(titleInput, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(mockUseRegisterDirtyState).toHaveBeenLastCalledWith(false);
    });
  });
});
