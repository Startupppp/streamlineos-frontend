import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type UseMutationOptions } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import type { CreateTicketInput } from "@/types/projects";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
jest.mock("./ticket-create-properties", () => ({
  TicketCreateProperties: () => null,
}));

import { CreateTicketDialog } from "./create-ticket-dialog";

function renderDialog() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <CreateTicketDialog projectId={1} />
    </QueryClientProvider>,
  );
}

describe("Create Issue never auto-creates (E1)", () => {
  beforeEach(() => {
    mockCreateTicket.mockReset();
    mockCreateTicket.mockResolvedValue({ id: 1 });
  });

  it("does not create when Enter is pressed in the title field", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /create issue/i }));
    const title = await screen.findByPlaceholderText("Issue title");
    fireEvent.change(title, { target: { value: "Should not auto create" } });
    fireEvent.keyDown(title, { key: "Enter", code: "Enter" });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(mockCreateTicket).not.toHaveBeenCalled();
  });

  it("blocks create for titles over 200 chars even if submit is attempted", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /create issue/i }));
    const title = await screen.findByPlaceholderText("Issue title");
    const long = `LONGTITLE-${"x".repeat(260)}`;
    fireEvent.change(title, { target: { value: long } });
    expect(title).toHaveValue(long);
    fireEvent.click(screen.getByRole("button", { name: "Create issue" }));
    await waitFor(() => {
      expect(screen.getByText(/200 characters or fewer/i)).toBeInTheDocument();
    });
    expect(mockCreateTicket).not.toHaveBeenCalled();
  });

  it("keeps every typed character when the parent re-renders from watch (E2)", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /create issue/i }));
    const title = await screen.findByPlaceholderText("Issue title");
    const typed = "Pass5 check full title";
    for (const ch of typed) {
      fireEvent.change(title, {
        target: { value: (title as HTMLInputElement).value + ch },
      });
    }
    expect(title).toHaveValue(typed);
  });
});

describe("Create Issue title field contract", () => {
  it("prevents Enter default on the title input", () => {
    const src = readFileSync(
      join(__dirname, "ticket-dialog-title-field.tsx"),
      "utf8",
    );
    expect(src).toMatch(/onKeyDown/);
    expect(src).toMatch(/Enter/);
    expect(src).toMatch(/preventDefault/);
  });
});
