import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddMemberDialog } from "./add-member-dialog";

const mockMutate = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("@/hooks/api/build/build-members", () => ({
  useAddBuildMember: () => ({
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
      data-testid="workspace-member-picker"
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

describe("AddMemberDialog — copy pins workspace context so a user cannot mistake this for a project invite", () => {
  it("title is 'Add workspace member' — not 'Add member' which could be confused with a project invite", () => {
    render(<AddMemberDialog open onOpenChange={jest.fn()} />);
    expect(screen.getByText("Add workspace member")).toBeInTheDocument();
  });

  it("title does NOT say 'Add project member' — workspace and project invites must remain visually distinct", () => {
    render(<AddMemberDialog open onOpenChange={jest.fn()} />);
    expect(screen.queryByText(/add project member/i)).not.toBeInTheDocument();
  });

  it("description mentions 'workspace' so the user understands this is not project-level access", () => {
    render(<AddMemberDialog open onOpenChange={jest.fn()} />);
    expect(screen.getByText(/Add someone to the Build workspace/i)).toBeInTheDocument();
  });

  it("success toast says 'Added to the Build workspace.' — past tense, workspace-specific, cannot be read as a project invite (FE-81)", async () => {
    mockMutate.mockImplementation(
      (
        _data: unknown,
        callbacks: { onSuccess: () => void },
      ) => {
        callbacks.onSuccess();
      },
    );
    render(<AddMemberDialog open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByTestId("workspace-member-picker"), {
      target: { value: "user-ws" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add member/i }));
    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith("Added to the Build workspace."),
    );
  });

  it("success toast does NOT say 'project' — paired with above to confirm it cannot regress to a project-claiming message", async () => {
    mockMutate.mockImplementation(
      (
        _data: unknown,
        callbacks: { onSuccess: () => void },
      ) => {
        callbacks.onSuccess();
      },
    );
    render(<AddMemberDialog open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByTestId("workspace-member-picker"), {
      target: { value: "user-ws" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add member/i }));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledTimes(1));
    const toastArg = mockToastSuccess.mock.calls[0]?.[0] as string | undefined;
    expect(toastArg?.toLowerCase()).not.toContain("project");
  });
});
