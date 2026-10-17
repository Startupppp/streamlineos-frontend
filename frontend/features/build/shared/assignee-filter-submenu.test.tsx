import { act, fireEvent, render, screen } from "@testing-library/react";
import { AssigneeFilterSubmenu } from "./assignee-filter-submenu";
import type { BuildMembersResponse } from "@/hooks/api/build/build-members";

const mockUseBuildMembers = jest.fn<
  { data: BuildMembersResponse | undefined; isLoading: boolean },
  [{ search?: string } | undefined]
>();

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: (params: { search?: string } | undefined) =>
    mockUseBuildMembers(params),
}));

jest.mock("@/components/list-view", () => ({
  OptionRow: ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button role="option" aria-selected={active} onClick={onClick}>
      {label}
    </button>
  ),
  FilterMenuSearch: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
  PanelShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  EmptyHint: ({ message }: { message: string }) => <p>{message}</p>,
}));

jest.mock("./filter-option-leading", () => ({
  FilterAssigneeLeading: () => null,
}));

function makeMember(id: string, name: string) {
  return {
    id,
    membershipId: 1,
    role: "member" as const,
    addedAt: "2024-01-01T00:00:00Z",
    name,
    firstName: name.split(" ")[0] ?? name,
    lastName: name.split(" ")[1] ?? null,
    email: `${id}@example.com`,
    image: null,
    teams: [],
  };
}

function makeResponse(
  members: ReturnType<typeof makeMember>[],
): BuildMembersResponse {
  return {
    data: members,
    pagination: { limit: 50, nextCursor: null, hasMore: false },
  };
}

function renderSubmenu(
  selectedAssignees: string[] = [],
  onToggleAssignee = jest.fn(),
  onClose = jest.fn(),
) {
  return render(
    <AssigneeFilterSubmenu
      selectedAssignees={selectedAssignees}
      onToggleAssignee={onToggleAssignee}
      onClose={onClose}
    />,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  mockUseBuildMembers.mockReset();
  mockUseBuildMembers.mockReturnValue({
    data: makeResponse([]),
    isLoading: false,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("AssigneeFilterSubmenu", () => {
  it("renders every member the server returns without filtering, including one reachable only outside the first page of projects", () => {
    const page2Member = makeMember("u-deep", "Deep Page Member");
    mockUseBuildMembers.mockReturnValue({
      data: makeResponse([makeMember("u1", "Alice"), page2Member]),
      isLoading: false,
    });
    renderSubmenu();
    expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Deep Page Member" }),
    ).toBeInTheDocument();
  });

  it("shows both members when two members share the same display name", () => {
    mockUseBuildMembers.mockReturnValue({
      data: makeResponse([
        makeMember("u1", "Sam Lee"),
        makeMember("u2", "Sam Lee"),
      ]),
      isLoading: false,
    });
    renderSubmenu();
    expect(screen.getAllByRole("option", { name: "Sam Lee" })).toHaveLength(2);
  });

  it("marks selected members as active and leaves others inactive", () => {
    mockUseBuildMembers.mockReturnValue({
      data: makeResponse([
        makeMember("u1", "Alice"),
        makeMember("u2", "Bob"),
      ]),
      isLoading: false,
    });
    renderSubmenu(["u1"]);
    const alice = screen.getByRole("option", { name: "Alice" });
    const bob = screen.getByRole("option", { name: "Bob" });
    expect(alice).toHaveAttribute("aria-selected", "true");
    expect(bob).toHaveAttribute("aria-selected", "false");
  });

  it("calls onToggleAssignee with the member id on click and the selected state is retained on re-render", () => {
    const onToggleAssignee = jest.fn();
    mockUseBuildMembers.mockReturnValue({
      data: makeResponse([makeMember("u1", "Alice")]),
      isLoading: false,
    });
    const { rerender } = render(
      <AssigneeFilterSubmenu
        selectedAssignees={[]}
        onToggleAssignee={onToggleAssignee}
        onClose={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("option", { name: "Alice" }));
    expect(onToggleAssignee).toHaveBeenCalledWith("u1");
    rerender(
      <AssigneeFilterSubmenu
        selectedAssignees={["u1"]}
        onToggleAssignee={onToggleAssignee}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByRole("option", { name: "Alice" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("does not call useBuildMembers with a search term until 300 ms have elapsed after typing stops", () => {
    mockUseBuildMembers.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
    });
    renderSubmenu();
    mockUseBuildMembers.mockClear();
    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "sam" } });
    act(() => {
      jest.advanceTimersByTime(299);
    });
    const callsWithSearch = mockUseBuildMembers.mock.calls.filter(
      (call) => call[0]?.search === "sam",
    );
    expect(callsWithSearch).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    const callsAfter = mockUseBuildMembers.mock.calls.filter(
      (call) => call[0]?.search === "sam",
    );
    expect(callsAfter.length).toBeGreaterThan(0);
  });

  it("renders the fixed options and member list without crashing when useBuildMembers returns no data", () => {
    mockUseBuildMembers.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderSubmenu();
    expect(screen.getByRole("option", { name: "Me (dynamic)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument();
  });
});
