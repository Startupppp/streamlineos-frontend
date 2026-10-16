import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiContractError } from "@/lib/api-envelope";
import { kbSpaceMemberListContract } from "@/hooks/api/kb/kb-spaces-settings-schema";
import { SpaceMembersSheet } from "./space-members-sheet";

const mockCan = jest.fn<boolean, [string]>();
const mockAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan(key),
  useAccess: () => mockAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
  }) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const mockKbSpaceMembers = jest.fn();
const mockAddMember = jest.fn();
const mockRemoveMember = jest.fn();
jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaceMembers: (...args: unknown[]) => mockKbSpaceMembers(...args),
  useAddKbSpaceMember: () => mockAddMember(),
  useRemoveKbSpaceMember: () => mockRemoveMember(),
}));

function member(over: Record<string, unknown> = {}) {
  return {
    id: 42,
    orgId: "org-1",
    spaceId: 10,
    membershipId: 7,
    role: null,
    team: null,
    spaceRole: "editor",
    createdAt: "2026-01-01T00:00:00.000Z",
    userId: "user-abc",
    userName: "Alice Smith",
    userEmail: "alice@example.com",
    userImage: null,
    ...over,
  };
}

function membersQuery(over: Record<string, unknown> = {}) {
  return {
    data: [member()],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  };
}

function mutation(over: Record<string, unknown> = {}) {
  return { mutate: jest.fn(), isPending: false, ...over };
}

const accessGranted = {
  data: { isOrgOwner: true, scopes: {}, modules: {} },
  isLoading: false,
};
const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function renderSheet() {
  return render(
    <SpaceMembersSheet
      spaceId={10}
      spaceName="Engineering"
      open
      onOpenChange={jest.fn()}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockReturnValue(false);
  mockAccess.mockReturnValue(accessGranted);
  mockKbSpaceMembers.mockReturnValue(membersQuery());
  mockAddMember.mockReturnValue(mutation());
  mockRemoveMember.mockReturnValue(mutation());
});

describe("SpaceMembersSheet — accessible name and description", () => {
  it("gives the dialog an accessible description, without which Radix warns and a screen reader announces the title with no explanation of what the sheet controls", () => {
    renderSheet();

    const dialog = screen.getByRole("dialog");
    const describedBy = dialog.getAttribute("aria-describedby");

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")).toHaveTextContent(
      /read or edit pages in this space/i,
    );
  });
});

describe("SpaceMembersSheet — permission gating", () => {
  it("shows the Add member form and Remove buttons for a user with kb:spaces:manage", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");

    renderSheet();

    expect(screen.getByRole("button", { name: /add member/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove alice smith/i })).toBeInTheDocument();
  });

  it("hides the Add member form and Remove buttons for a user without kb:spaces:manage", () => {
    mockCan.mockReturnValue(false);

    renderSheet();

    expect(screen.queryByRole("button", { name: /add member/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove alice smith/i })).not.toBeInTheDocument();
  });
});

describe("SpaceMembersSheet — denial is not emptiness", () => {
  it("renders the denied state — not No members yet — when the user is denied kb:spaces:manage", () => {
    mockAccess.mockReturnValue(accessDenied);
    mockCan.mockReturnValue(false);
    mockKbSpaceMembers.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    renderSheet();

    expect(screen.queryByText("No members yet")).not.toBeInTheDocument();
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("hides the add form when the read is denied even if the mutation permission was cached", () => {
    mockAccess.mockReturnValue(accessDenied);
    mockCan.mockReturnValue(true);
    mockKbSpaceMembers.mockReturnValue(membersQuery({ data: undefined }));

    renderSheet();

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add member/i })).not.toBeInTheDocument();
  });
});

describe("SpaceMembersSheet — member read failure", () => {
  it("hides the add form while the first read is loading or failed and retries the read", async () => {
    mockCan.mockReturnValue(true);
    const refetch = jest.fn();
    mockKbSpaceMembers.mockReturnValue(membersQuery({ data: undefined, isLoading: true, refetch }));
    const view = renderSheet();

    expect(screen.queryByRole("button", { name: /add member/i })).not.toBeInTheDocument();

    mockKbSpaceMembers.mockReturnValue(membersQuery({ data: undefined, isError: true, error: new Error("offline"), refetch }));
    view.rerender(<SpaceMembersSheet spaceId={10} spaceName="Engineering" open onOpenChange={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add member/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("contains a strict contract error in the sheet with its reference and recovers on retry", async () => {
    const result = kbSpaceMemberListContract.safeParse({ data: [member()] });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected the member list contract to reject an object");

    const contractError = new ApiContractError(
      "GET /kb/spaces/10/members",
      200,
      result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      "members-request-123",
    );
    let recovered = false;
    mockKbSpaceMembers.mockImplementation(() => {
      if (!recovered) throw contractError;
      return membersQuery();
    });

    render(
      <>
        <div>Spaces route content</div>
        <SpaceMembersSheet spaceId={10} spaceName="Engineering" open onOpenChange={jest.fn()} />
      </>,
    );

    expect(screen.getByText("Spaces route content")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /members — engineering/i })).toBeInTheDocument();
    expect(screen.getByText("members-request-123")).toBeInTheDocument();
    expect(screen.queryByText("No members yet")).not.toBeInTheDocument();

    recovered = true;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Spaces route content")).toBeInTheDocument();
  });
});

describe("SpaceMembersSheet — add member", () => {
  beforeEach(() => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
  });

  it("calls useAddKbSpaceMember with userId and spaceRole when only userId is filled", async () => {
    const mutateMock = jest.fn();
    mockAddMember.mockReturnValue({ mutate: mutateMock, isPending: false });

    renderSheet();

    await userEvent.type(screen.getByPlaceholderText("Select member…"), "user-xyz");
    await userEvent.click(screen.getByRole("button", { name: /add member/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 10, userId: "user-xyz", role: undefined }),
      expect.anything(),
    );
  });

  it("calls useAddKbSpaceMember with role and spaceRole when only role is filled", async () => {
    const mutateMock = jest.fn();
    mockAddMember.mockReturnValue({ mutate: mutateMock, isPending: false });

    renderSheet();

    await userEvent.type(screen.getByPlaceholderText("e.g. engineer"), "engineer");
    await userEvent.click(screen.getByRole("button", { name: /add member/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 10, role: "engineer", userId: undefined }),
      expect.anything(),
    );
  });

  it("does not call the mutation and shows a validation error when both userId and role are filled", async () => {
    const mutateMock = jest.fn();
    mockAddMember.mockReturnValue({ mutate: mutateMock, isPending: false });

    renderSheet();

    await userEvent.type(screen.getByPlaceholderText("Select member…"), "user-xyz");
    await userEvent.type(screen.getByPlaceholderText("e.g. engineer"), "engineer");
    await userEvent.click(screen.getByRole("button", { name: /add member/i }));

    expect(mutateMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Provide either a user ID or a role, not both"),
    ).toBeInTheDocument();
  });
});

describe("SpaceMembersSheet — remove member", () => {
  beforeEach(() => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
  });

  it("calls useRemoveKbSpaceMember with the correct spaceId and memberId when Remove is clicked", async () => {
    const mutateMock = jest.fn();
    mockRemoveMember.mockReturnValue({ mutate: mutateMock, isPending: false });

    renderSheet();

    await userEvent.click(screen.getByRole("button", { name: /remove alice smith/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      { spaceId: 10, memberId: 42 },
      expect.anything(),
    );
  });
});
