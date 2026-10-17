import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { DirtyStateProvider, useHasUnsavedWork, useNavigationLeave } from "@/components/shared/dirty-state-context";
import { AddProjectMemberDialog } from "./add-project-member-dialog";
import { ApiError } from "@/lib/api-envelope";

const mockMutate = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockRequest = jest.fn();
let mockUseRealMutation = false;
let mockMemberChange: (id: string | null) => void = () => undefined;
const mockMemberPicker = jest.fn();

jest.mock("@/hooks/api/build/project-members", () => ({
  useAddProjectMember: () => mockUseRealMutation
    ? jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query").useMutation({ mutationFn: mockRequest, retry: false })
    : ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: ({
    onChange,
    placeholder,
    value,
    disabled,
    directory,
    moduleKey,
  }: {
    onChange: (id: string | null) => void;
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    directory?: string;
    moduleKey?: string;
  }) => {
    mockMemberPicker({ directory, moduleKey });
    mockMemberChange = onChange;
    return (
    <input
      data-testid="member-picker"
      placeholder={placeholder}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
    />
    );
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockUseRealMutation = false;
});

function NavigationProbe({ leave }: { leave: () => void }) {
  const requestLeave = useNavigationLeave();
  const dirty = useHasUnsavedWork();
  function handleLeave() { requestLeave(leave); }
  return <><button data-testid="leave" onClick={handleLeave}>Leave project</button><span data-testid="dirty">{dirty ? "dirty" : "clean"}</span></>;
}

function DialogHarness({ close, leave }: { close: (open: boolean) => void; leave: () => void }) {
  const [open, setOpen] = useState(true);
  function handleOpenChange(next: boolean) { close(next); setOpen(next); }
  function handleReopen() { setOpen(true); }
  return <><button data-testid="reopen" onClick={handleReopen}>Reopen</button><NavigationProbe leave={leave} /><AddProjectMemberDialog projectId={42} open={open} onOpenChange={handleOpenChange} /></>;
}

function renderForm() {
  mockUseRealMutation = true;
  const close = jest.fn();
  const leave = jest.fn();
  render(<QueryClientProvider client={createAppQueryClient()}><DirtyStateProvider><DialogHarness close={close} leave={leave} /></DirtyStateProvider></QueryClientProvider>);
  return { close, leave };
}

async function fillDraft() {
  fireEvent.change(screen.getByTestId("member-picker"), { target: { value: "retained-member" } });
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "Admin" }));
}

function deferred() {
  let resolve: (value: object) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<object>((accept, refuse) => { resolve = accept; reject = refuse; });
  return { promise, resolve, reject };
}

function respond(error?: Error) {
  mockMutate.mockImplementation((_data: unknown, callbacks: { onSuccess: () => void; onError: (error: unknown) => void }) => {
    if (error) callbacks.onError(error);
    else callbacks.onSuccess();
  });
}

function dismiss(action: string) {
  if (action === "Escape") fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  else if (action === "outside") fireEvent.pointerDown(document.body, { button: 0, pointerType: "mouse" });
  else fireEvent.click(screen.getByRole("button", { name: action }));
}

describe("actual project member draft recovery", () => {
  it("blocks real navigation and Keep Editing retains exact form selection", async () => {
    const { leave } = renderForm();
    await fillDraft();
    fireEvent.click(screen.getByTestId("leave"));
    expect(leave).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /keep editing/i }));
    expect(screen.getByTestId("member-picker")).toHaveValue("retained-member");
    expect(screen.getByRole("combobox")).toHaveTextContent("Admin");
    expect(screen.getByTestId("dirty")).toHaveTextContent("dirty");
  });

  it.each(["Close", "Escape", "outside"])("refuses Dialog %s during a real deferred mutation", async action => {
    const pending = deferred();
    mockRequest.mockReturnValueOnce(pending.promise);
    const { close } = renderForm();
    await fillDraft();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    try {
      await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
      dismiss(action);
      expect(close).not.toHaveBeenCalled();
      expect(screen.getByTestId("member-picker")).toHaveValue("retained-member");
      expect(screen.getByRole("combobox")).toHaveTextContent("Admin");
      expect(screen.getByRole("dialog")).toBeVisible();
    } finally { await act(async () => { pending.reject(new Error("Unavailable")); }); }
  });

  it("refuses queued member, role and repeated submit changes while pending", async () => {
    const pending = deferred();
    mockRequest.mockReturnValueOnce(pending.promise);
    const { close } = renderForm();
    await fillDraft();
    const form = screen.getByRole("form");
    const role = screen.getByRole("combobox");
    fireEvent.keyDown(role, { key: "ArrowDown" });
    const viewer = await screen.findByRole("option", { name: "Viewer" });
    fireEvent.submit(form);
    await waitFor(() => expect(role).toBeDisabled());
    try {
      expect(screen.getByTestId("member-picker")).toBeDisabled();
      act(() => { mockMemberChange("replacement-member"); });
      fireEvent.click(viewer);
      fireEvent.submit(form);
      expect(screen.getByTestId("member-picker")).toHaveValue("retained-member");
      expect(role).toHaveTextContent("Admin");
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(close).not.toHaveBeenCalled();
    } finally { await act(async () => { pending.reject(new Error("Unavailable")); }); }
  });

  it("retains failure input, retries exactly and resets only after acknowledged success", async () => {
    const first = deferred();
    const retry = deferred();
    mockRequest.mockReturnValueOnce(first.promise).mockReturnValueOnce(retry.promise);
    const { close } = renderForm();
    await fillDraft();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    await act(async () => { first.reject(new ApiError("Unavailable", 503)); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Add to project" })).toBeEnabled());
    expect(close).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("member-picker")).toHaveValue("retained-member");
    expect(screen.getByRole("combobox")).toHaveTextContent("Admin");
    expect(screen.getByTestId("dirty")).toHaveTextContent("dirty");
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(mockRequest.mock.calls[0][0]).toEqual({ projectId: 42, userId: "retained-member", role: "ADMIN" });
    expect(mockRequest.mock.calls[1][0]).toEqual(mockRequest.mock.calls[0][0]);
    await act(async () => { retry.resolve({ userId: "retained-member", role: "ADMIN" }); });
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(close).toHaveBeenCalledWith(false);
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("dirty")).toHaveTextContent("clean");
    fireEvent.click(screen.getByTestId("reopen"));
    expect(screen.getByTestId("member-picker")).toHaveValue("");
    expect(screen.getByRole("combobox")).toHaveTextContent("Member");
  });

  it.each(["Cancel", "Close", "Escape", "outside"])("preserves idle %s cancellation and clears its registration", async action => {
    const { close } = renderForm();
    await fillDraft();
    await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
    dismiss(action);
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(screen.getByTestId("dirty")).toHaveTextContent("clean");
  });
});

describe("AddProjectMemberDialog — renders title specific to project (not workspace)", () => {
  it("limits the picker to the existing Build actor directory", () => {
    render(<AddProjectMemberDialog projectId={42} open onOpenChange={jest.fn()} />);
    expect(mockMemberPicker).toHaveBeenCalledWith({
      directory: "build",
      moduleKey: "build",
    });
  });

  it("renders 'Add project member' so users cannot mistake this for the workspace-level dialog", () => {
    render(<AddProjectMemberDialog projectId={42} open onOpenChange={jest.fn()} />);
    expect(screen.getByText("Add project member")).toBeInTheDocument();
  });

  it("description says 'direct access to this project' — not a workspace invite", () => {
    render(<AddProjectMemberDialog projectId={42} open onOpenChange={jest.fn()} />);
    expect(screen.getByText(/direct access to this project/i)).toBeInTheDocument();
  });

  it("does not render when open is false — paired with the title test above", () => {
    render(<AddProjectMemberDialog projectId={42} open={false} onOpenChange={jest.fn()} />);
    expect(screen.queryByText("Add project member")).not.toBeInTheDocument();
  });
});

describe("AddProjectMemberDialog — submit calls project endpoint with correct projectId (FE-44)", () => {
  it("calls useAddProjectMember.mutate with the correct projectId so the POST targets /build/:projectId/members not /build/members", async () => {
    respond();
    render(<AddProjectMemberDialog projectId={99} open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByTestId("member-picker"), {
      target: { value: "user-abc" },
    });
    fireEvent.submit(screen.getByRole("form", { hidden: true }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 99, userId: "user-abc" }), expect.anything(),
    );
  });

  it("success toast says 'Added to project.' — past tense, project-specific, not workspace-claiming (FE-81)", async () => {
    respond();
    render(<AddProjectMemberDialog projectId={1} open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByTestId("member-picker"), {
      target: { value: "user-xyz" },
    });
    fireEvent.submit(screen.getByRole("form", { hidden: true }));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Added to project."));
  });
});

describe("AddProjectMemberDialog — 409 conflict surfaces specific message (FE-78)", () => {
  it("shows 'already a member' message for 409 — not a generic error — so the user knows what happened", async () => {
    const conflict = new ApiError("already a member", 409, "CONFLICT");
    respond(conflict);
    render(<AddProjectMemberDialog projectId={1} open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByTestId("member-picker"), {
      target: { value: "user-dupe" },
    });
    fireEvent.submit(screen.getByRole("form", { hidden: true }));
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "This person is already a member of this project.",
      ),
    );
  });

  it("shows generic error for non-409 failures — paired with 409 test above to confirm 409 path is not vacuous", async () => {
    const serverError = new ApiError("internal error", 500);
    respond(serverError);
    render(<AddProjectMemberDialog projectId={1} open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByTestId("member-picker"), {
      target: { value: "user-err" },
    });
    fireEvent.submit(screen.getByRole("form", { hidden: true }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    expect(mockToastError).not.toHaveBeenCalledWith(
      "This person is already a member of this project.",
    );
  });
});

describe("AddProjectMemberDialog — a locked project is not reported as an existing member", () => {
  it("routes a 409 PROJECT_LOCKED through getErrorMessage instead of claiming the person is already a member", async () => {
    const locked = new ApiError("This project is archived. Reopen it before making changes.", 409, "PROJECT_LOCKED", {
      state: "ARCHIVED",
    });
    respond(locked);
    render(<AddProjectMemberDialog projectId={1} open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByTestId("member-picker"), {
      target: { value: "user-locked" },
    });
    fireEvent.submit(screen.getByRole("form", { hidden: true }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    expect(mockToastError).not.toHaveBeenCalledWith(
      "This person is already a member of this project.",
    );
  });
});

describe("AddProjectMemberDialog — validation prevents submit with no member selected", () => {
  it("does not call mutate when no member is selected — form validation blocks the empty submit", async () => {
    render(<AddProjectMemberDialog projectId={1} open onOpenChange={jest.fn()} />);
    fireEvent.submit(screen.getByRole("form", { hidden: true }));
    await waitFor(() => expect(mockMutate).not.toHaveBeenCalled());
  });
});
