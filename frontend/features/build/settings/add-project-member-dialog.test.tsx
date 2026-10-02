import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddProjectMemberDialog } from "./add-project-member-dialog";
import { ApiError } from "@/lib/api-envelope";

const mockMutate = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("@/hooks/api/build/project-members", () => ({
  useAddProjectMember: () => ({
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
  }: {
    onChange: (id: string | null) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="member-picker"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value || null)}
    />
  ),
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AddProjectMemberDialog — renders title specific to project (not workspace)", () => {
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
    mockMutate.mockImplementation(
      (
        _data: unknown,
        callbacks: { onSuccess: () => void },
      ) => {
        callbacks.onSuccess();
      },
    );
    render(<AddProjectMemberDialog projectId={99} open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByTestId("member-picker"), {
      target: { value: "user-abc" },
    });
    fireEvent.submit(screen.getByRole("form", { hidden: true }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 99, userId: "user-abc" }),
      expect.anything(),
    );
  });

  it("success toast says 'Added to project.' — past tense, project-specific, not workspace-claiming (FE-81)", async () => {
    mockMutate.mockImplementation(
      (
        _data: unknown,
        callbacks: { onSuccess: () => void },
      ) => {
        callbacks.onSuccess();
      },
    );
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
    mockMutate.mockImplementation(
      (
        _data: unknown,
        callbacks: { onError: (e: unknown) => void },
      ) => {
        callbacks.onError(conflict);
      },
    );
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
    mockMutate.mockImplementation(
      (
        _data: unknown,
        callbacks: { onError: (e: unknown) => void },
      ) => {
        callbacks.onError(serverError);
      },
    );
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
    mockMutate.mockImplementation(
      (
        _data: unknown,
        callbacks: { onError: (e: unknown) => void },
      ) => {
        callbacks.onError(locked);
      },
    );
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
