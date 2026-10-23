import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type UseMutationOptions } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import type { CreateTicketInput } from "@/types/projects";

const mockCreateTicket = jest.fn();
const mockUseRegisterDirtyState = jest.fn();

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: (...args: unknown[]) => mockUseRegisterDirtyState(...args),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: { id: 1, key: "FIRST", statuses: [] } }),
  useProjects: () => ({
    data: { data: [{ id: 1, key: "FIRST", name: "First project" }] },
    isLoading: false,
  }),
  useProjectLabels: () => ({ data: [] }),
  useProjectMembers: () => ({ data: [] }),
}));
jest.mock("@/hooks/api/build/cycles", () => ({ useCycles: () => ({ data: [] }) }));
jest.mock("@/hooks/api/build/tickets", () => ({
  useAddLabelToTicket: () => ({ mutateAsync: jest.fn() }),
  useCreateTicket: (
    options: Pick<
      UseMutationOptions<{ id: number }, Error, CreateTicketInput>,
      "onSuccess" | "onError"
    >,
  ) =>
    jest
      .requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
      .useMutation({ ...options, mutationFn: mockCreateTicket, retry: false }),
  useAddAttachment: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/hooks/api/build/project-files", () => ({
  MAX_PROJECT_FILE_BYTES: 2e6,
  useUploadProjectFile: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("./use-duplicate-title-warning", () => ({
  useDuplicateTitleWarning: () => [],
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

import { CreateTicketDialog } from "./create-ticket-dialog";

function renderDialog() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <CreateTicketDialog projectId={1} />
    </QueryClientProvider>,
  );
}

describe("Create Issue — story-points gate blocks submission (BUG-06 real component)", () => {
  beforeEach(() => {
    mockCreateTicket.mockReset();
    mockCreateTicket.mockResolvedValue({ id: 1 });
  });

  it("blocks Create when the points field contains a value above the max", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /create issue/i }));
    const title = await screen.findByPlaceholderText("Issue title");
    fireEvent.change(title, { target: { value: "Valid ticket title" } });

    const points = screen.getByRole("spinbutton");
    fireEvent.change(points, { target: { value: "1000000000" } });

    await waitFor(() => {
      expect(screen.getByText(/Enter a whole number between 0 and 100/i)).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: "Create issue" });
    expect(createBtn).toBeDisabled();

    fireEvent.click(createBtn);
    expect(mockCreateTicket).not.toHaveBeenCalled();
  });

  it("blocks Create when the points field contains a negative value", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /create issue/i }));
    const title = await screen.findByPlaceholderText("Issue title");
    fireEvent.change(title, { target: { value: "Valid ticket title" } });

    const points = screen.getByRole("spinbutton");
    fireEvent.change(points, { target: { value: "-5" } });

    await waitFor(() => {
      expect(screen.getByText(/Enter a whole number between 0 and 100/i)).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: "Create issue" });
    expect(createBtn).toBeDisabled();

    fireEvent.click(createBtn);
    expect(mockCreateTicket).not.toHaveBeenCalled();
  });

  it("allows Create after the user corrects an invalid points value", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /create issue/i }));
    const title = await screen.findByPlaceholderText("Issue title");
    fireEvent.change(title, { target: { value: "Valid ticket title" } });

    const points = screen.getByRole("spinbutton");
    fireEvent.change(points, { target: { value: "1000000000" } });

    await waitFor(() => {
      expect(screen.getByText(/Enter a whole number between 0 and 100/i)).toBeInTheDocument();
    });

    fireEvent.change(points, { target: { value: "5" } });

    await waitFor(() => {
      expect(screen.queryByText(/Enter a whole number between 0 and 100/i)).not.toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: "Create issue" });
    expect(createBtn).not.toBeDisabled();
  });

  it("clears the error and allows Create when the points field is emptied after an invalid value", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /create issue/i }));
    const title = await screen.findByPlaceholderText("Issue title");
    fireEvent.change(title, { target: { value: "Valid ticket title" } });

    const points = screen.getByRole("spinbutton");
    fireEvent.change(points, { target: { value: "1000000000" } });

    await waitFor(() => {
      expect(screen.getByText(/Enter a whole number between 0 and 100/i)).toBeInTheDocument();
    });

    fireEvent.change(points, { target: { value: "" } });

    await waitFor(() => {
      expect(screen.queryByText(/Enter a whole number between 0 and 100/i)).not.toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: "Create issue" });
    expect(createBtn).not.toBeDisabled();
  });
});
