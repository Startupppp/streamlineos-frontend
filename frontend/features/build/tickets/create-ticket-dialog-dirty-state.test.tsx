import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type UseMutationOptions } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import type { CreateTicketInput } from "@/types/projects";

const mockUseRegisterDirtyState = jest.fn();
const mockCreateTicket = jest.fn();
const mockUpload = jest.fn();
const mockAddAttachment = jest.fn();

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: (...args: unknown[]) =>
    mockUseRegisterDirtyState(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: (id: number) => ({ data: { id, key: id === 1 ? "FIRST" : "SECOND", statuses: [] } }),
  useProjects: () => ({ data: { data: [{ id: 1, key: "FIRST", name: "First project" }, { id: 2, key: "SECOND", name: "Second project" }] }, isLoading: false }),
  useProjectLabels: () => ({ data: [] }),
  useProjectMembers: () => ({ data: [] }),
}));


jest.mock("@/hooks/api/build/advanced", () => ({
  useCycles: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/build/tickets", () => ({
  useAddLabelToTicket: () => ({ mutateAsync: jest.fn() }),
  useCreateTicket: (options: Pick<UseMutationOptions<{ id: number }, Error, CreateTicketInput>, "onSuccess" | "onError">) =>
    jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query").useMutation({ ...options, mutationFn: mockCreateTicket, retry: false }),
  useAddAttachment: () => ({ mutateAsync: mockAddAttachment }),
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { upload: (...args: unknown[]) => mockUpload(...args) } }));
jest.mock("./use-duplicate-title-warning", () => ({ useDuplicateTitleWarning: () => [] }));

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

function renderDialog(projectId: number | null = 1, onExternalOpenChange = jest.fn()) {
  const client = createAppQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <CreateTicketDialog projectId={projectId ?? undefined} onExternalOpenChange={onExternalOpenChange} />
    </QueryClientProvider>,
  );
}

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: /create issue/i }));
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((accept, refuse) => { resolve = accept; reject = refuse; });
  return { promise, resolve, reject };
}

async function chooseProject(name: RegExp) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Select project" }), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name }));
}

function dismiss(action: string) {
  if (action === "Escape") fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  else if (action === "outside") fireEvent.pointerDown(document.body, { button: 0, pointerType: "mouse" });
  else fireEvent.click(screen.getByRole("button", { name: "Close" }));
}

function attachProof() {
  const input = document.querySelector<HTMLInputElement>("input[type=file]");
  if (!input) throw new Error("Missing attachment input");
  fireEvent.change(input, { target: { files: [new File(["synthetic attachment"], "proof.pdf", { type: "application/pdf" })] } });
}

describe("CreateTicketDialog registers with the shared dirty-state guard (BSN-04-A03), so a scope switch mid-draft prompts instead of silently discarding a typed ticket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddAttachment.mockResolvedValue(undefined);
  });

  it.each(["Close", "Escape", "outside"])("retains the actual form during pending create %s", async action => {
    const pending = deferred<{ id: number }>();
    mockCreateTicket.mockReturnValueOnce(pending.promise);
    const close = jest.fn();
    renderDialog(1, close);
    openDialog();
    fireEvent.change(screen.getByPlaceholderText("Issue title"), { target: { value: "Retained pending issue" } });
    fireEvent.click(screen.getByRole("button", { name: "Create issue" }));
    await waitFor(() => expect(mockCreateTicket).toHaveBeenCalledTimes(1));
    try {
      await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
      dismiss(action);
      expect(screen.getByRole("dialog")).toBeVisible();
      expect(close).not.toHaveBeenCalled();
      expect(screen.getByPlaceholderText("Issue title")).toHaveValue("Retained pending issue");
    } finally { await act(async () => { pending.reject(new Error("Create unavailable")); }); }
  });

  it.each(["create", "upload"])("retains the selected project when a queued selection runs during %s", async phase => {
    const pending = deferred<{ id: number }>();
    const upload = deferred<{ key: string }>();
    if (phase === "create") mockCreateTicket.mockReturnValueOnce(pending.promise);
    else { mockCreateTicket.mockResolvedValueOnce({ id: 359 }); mockUpload.mockReturnValueOnce(upload.promise); }
    renderDialog(null);
    openDialog();
    await chooseProject(/FIRST First project/);
    fireEvent.change(screen.getByPlaceholderText("Issue title"), { target: { value: "Retained project issue" } });
    if (phase === "upload") attachProof();
    const submit = screen.getByRole("button", { name: "Create issue" });
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Select project" }), { key: "ArrowDown" });
    const nextProject = await screen.findByRole("option", { name: /SECOND Second project/ });
    fireEvent.click(submit);
    await waitFor(() => expect(phase === "create" ? mockCreateTicket : mockUpload).toHaveBeenCalledTimes(1));
    try {
      fireEvent.click(nextProject);
      expect(screen.getByRole("combobox", { name: "Select project" })).toHaveTextContent("FIRST");
      expect(screen.getByRole("combobox", { name: "Select project" })).toBeDisabled();
    } finally { await act(async () => { if (phase === "create") pending.reject(new Error("Create unavailable")); else upload.resolve({ key: "synthetic-proof.pdf" }); }); }
  });

  it("retains the exact failed request and project for retry, then closes only once after acknowledgement", async () => {
    const failed = deferred<{ id: number }>();
    const retry = deferred<{ id: number }>();
    mockCreateTicket.mockReturnValueOnce(failed.promise).mockReturnValueOnce(retry.promise);
    const close = jest.fn();
    renderDialog(null, close);
    openDialog();
    await chooseProject(/FIRST First project/);
    fireEvent.change(screen.getByPlaceholderText("Issue title"), { target: { value: "Exact retry issue" } });
    fireEvent.click(screen.getByRole("button", { name: "Create issue" }));
    await waitFor(() => expect(mockCreateTicket).toHaveBeenCalledTimes(1));
    await act(async () => { failed.reject(new Error("Create unavailable")); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Create issue" })).toBeEnabled());
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Issue title")).toHaveValue("Exact retry issue");
    expect(screen.getByRole("combobox", { name: "Select project" })).toHaveTextContent("FIRST");
    expect(mockUseRegisterDirtyState).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Create issue" }));
    await waitFor(() => expect(mockCreateTicket).toHaveBeenCalledTimes(2));
    expect(mockCreateTicket.mock.calls[1]).toEqual(mockCreateTicket.mock.calls[0]);
    expect(mockCreateTicket).toHaveBeenNthCalledWith(2, expect.objectContaining({ projectId: 1, title: "Exact retry issue", type: "TASK", status: "TODO" }), expect.anything());
    await act(async () => { retry.resolve({ id: 359 }); });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith(false);
    expect(mockUseRegisterDirtyState).toHaveBeenLastCalledWith(false);
    openDialog();
    expect(screen.getByPlaceholderText("Issue title")).toHaveValue("");
  });

  it("keeps upload work and its selected project until attachment acknowledgement", async () => {
    const upload = deferred<{ key: string }>();
    mockCreateTicket.mockResolvedValueOnce({ id: 359 });
    mockUpload.mockReturnValueOnce(upload.promise);
    const close = jest.fn();
    renderDialog(1, close);
    openDialog();
    fireEvent.change(screen.getByPlaceholderText("Issue title"), { target: { value: "Pending attachment issue" } });
    attachProof();
    fireEvent.click(screen.getByRole("button", { name: "Create issue" }));
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
    dismiss("Close");
    dismiss("Escape");
    await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
    dismiss("outside");
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(close).not.toHaveBeenCalled();
    expect(mockAddAttachment).not.toHaveBeenCalled();
    await act(async () => { upload.resolve({ key: "synthetic-proof.pdf" }); });
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(mockAddAttachment).toHaveBeenCalledWith(expect.objectContaining({ projectId: 1, ticketId: 359, fileName: "proof.pdf", fileUrl: "synthetic-proof.pdf" }));
  });

  it("preserves create-more context and resets only the completed draft", async () => {
    mockCreateTicket.mockResolvedValueOnce({ id: 359 });
    const close = jest.fn();
    renderDialog(1, close);
    openDialog();
    fireEvent.click(screen.getByRole("switch", { name: "Create more" }));
    fireEvent.change(screen.getByPlaceholderText("Issue title"), { target: { value: "Create another issue" } });
    fireEvent.click(screen.getByRole("button", { name: "Create issue" }));
    await waitFor(() => expect(screen.getByPlaceholderText("Issue title")).toHaveValue(""));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Select project" })).toHaveTextContent("FIRST");
    expect(close).not.toHaveBeenCalled();
    expect(mockUseRegisterDirtyState).toHaveBeenLastCalledWith(false);
  });

  it.each(["Close", "Escape", "outside"])("retains idle cancellation through %s", async action => {
    renderDialog();
    openDialog();
    await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
    dismiss(action);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockCreateTicket).not.toHaveBeenCalled();
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
