import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders, axeViolationIds } from "@/test-utils";
import { PickWaveReassign } from "./pick-wave-reassign";

/**
 * The reassign control's five outcomes, kept apart on purpose.
 *
 * The hook behind this shipped unreferenced: `POST
 * /inventory/picking/waves/:id/reassign` existed, was permissioned and was
 * idempotency-fenced, and no component called it. What made wiring it awkward
 * is that the roster and the action carry *different* backend keys, so a real
 * operator can hold one and not the other — the `INVENTORY_MANAGER` template
 * carries both, but a shipping-only role carries neither directory. Each of
 * those combinations has to say which one it is, because "no members found" and
 * "you may not read the roster" look identical and mean opposite things.
 */

const mockMutate = jest.fn();
const mockRefetch = jest.fn();
let mockPending = false;
let mockCan: Record<string, boolean> = {};
let mockRoster: {
  data?: { items: unknown[]; total: number; page: number; totalPages: number };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} = { data: undefined, isLoading: false, isError: false, error: null };

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan[key] ?? false,
}));

jest.mock("@/hooks/api/inventory/picking", () => ({
  ...jest.requireActual("@/hooks/api/inventory/picking"),
  useReassignPickWave: () => ({ mutate: mockMutate, isPending: mockPending }),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  ...jest.requireActual("@/hooks/api/inventory/warehouses"),
  useWarehouseAssignees: () => ({ ...mockRoster, refetch: mockRefetch }),
}));

// MemberPicker's own directory sources. An explicit candidate list disables all
// of them, but the hooks still run and they have no business fetching here.
jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
  useOrgMembersByIds: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/build/projects", () => ({
  useProjectMembers: () => ({ data: [] }),
}));
jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/module-access", () => ({
  useModuleMemberCandidates: () => ({ data: undefined }),
}));

const SHIP = "inventory:sales-orders:ship";
const MANAGE_WAREHOUSE = "inventory:warehouses:manage";

function assignee(userId: string, name: string) {
  return {
    userId,
    name,
    firstName: null,
    lastName: null,
    email: `${userId}@example.test`,
    image: null,
    grantedBy: "supervisor",
    grantedByName: "Supervisor",
    grantedAt: "2026-09-01T00:00:00.000Z",
  };
}

function rosterOf(...items: ReturnType<typeof assignee>[]) {
  return { items, total: items.length, page: 1, totalPages: 1 };
}

function renderControl(overrides: Partial<React.ComponentProps<typeof PickWaveReassign>> = {}) {
  return renderWithProviders(
    <PickWaveReassign
      pickListId={44}
      warehouseId={7}
      assignedTo="picker-a"
      finished={false}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  mockMutate.mockReset();
  mockRefetch.mockReset();
  mockPending = false;
  mockCan = { [SHIP]: true, [MANAGE_WAREHOUSE]: true };
  mockRoster = {
    data: rosterOf(assignee("picker-a", "Asha Rao"), assignee("picker-b", "Bhavna Iyer")),
    isLoading: false,
    isError: false,
    error: null,
  };
});

describe("PickWaveReassign", () => {
  it("renders nothing without the endpoint's own permission", () => {
    mockCan = { [SHIP]: false, [MANAGE_WAREHOUSE]: true };
    const { container } = renderControl();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once the wave is finished, which the server refuses anyway", () => {
    const { container } = renderControl({ finished: true });
    expect(container).toBeEmptyDOMElement();
  });

  it("says the roster is unreadable rather than showing an empty picker", () => {
    mockCan = { [SHIP]: true, [MANAGE_WAREHOUSE]: false };
    renderControl();
    expect(screen.getByText(/needs warehouse-assignment access/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("distinguishes a wave with no warehouse from a wave with no candidates", () => {
    const { unmount } = renderControl({ warehouseId: null });
    expect(screen.getByText(/not scoped to a warehouse/i)).toBeInTheDocument();
    unmount();

    mockRoster = { ...mockRoster, data: rosterOf(assignee("picker-a", "Asha Rao")) };
    renderControl();
    expect(screen.getByText(/Nobody else holds scope/i)).toBeInTheDocument();
  });

  it("distinguishes loading from empty", () => {
    mockRoster = { data: undefined, isLoading: true, isError: false, error: null };
    renderControl();
    expect(screen.getByText(/Loading who can pick here/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nobody else holds scope/i)).not.toBeInTheDocument();
  });

  it("surfaces a roster failure with a retry rather than an empty list", () => {
    mockRoster = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Warehouse not found"),
    };
    renderControl();
    expect(screen.getByText("Warehouse not found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("hands the wave to the picked member and excludes the current holder", async () => {
    renderControl();
    fireEvent.click(screen.getByRole("button", { name: /hand to someone else/i }));

    await waitFor(() => expect(screen.getByText("Bhavna Iyer")).toBeInTheDocument());
    expect(screen.queryByText("Asha Rao")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Bhavna Iyer"));
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate.mock.calls[0]?.[0]).toEqual({
      pickListId: 44,
      assigneeUserId: "picker-b",
    });
  });

  it("labels an unclaimed wave as an assignment rather than a hand-over", () => {
    renderControl({ assignedTo: null });
    expect(screen.getByRole("button", { name: /assign a picker/i })).toBeInTheDocument();
  });

  it("shows the in-flight hand-over as a pending button", () => {
    mockPending = true;
    renderControl();
    const button = screen.getByRole("button", { name: /handing over/i });
    expect(button).toBeDisabled();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderControl();
    await expect(axeViolationIds(container)).resolves.toEqual([]);
  });
});
