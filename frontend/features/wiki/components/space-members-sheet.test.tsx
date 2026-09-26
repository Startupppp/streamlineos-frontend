import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
