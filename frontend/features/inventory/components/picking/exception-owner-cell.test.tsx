import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders, axeViolationIds } from "@/test-utils";
import { ExceptionOwnerCell } from "./exception-owner-cell";
import { PickExceptionQueue } from "./pick-exception-queue";
import type { PickExceptionSummary } from "@/hooks/api/inventory/pick-exceptions";

/**
 * An exception could never leave the person it landed on.
 *
 * `reportException` stamps the owner as the wave's creator, so the queue always
 * had an owner and never a way to change one. `POST
 * /inventory/picking/exceptions/:pickLineId/assign` was mounted, carried
 * `inventory:picking:review` and was referenced by nothing.
 */

const mockAssignMutate = jest.fn();
const mockRefetch = jest.fn();
let mockCan: Record<string, boolean> = {};
let mockRoster: {
  data?: { items: unknown[]; total: number; page: number; totalPages: number };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} = { data: undefined, isLoading: false, isError: false, error: null };

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan[key] ?? false,
  useCanState: (key: string) => (mockCan[key] ? "granted" : "denied"),
}));

jest.mock("@/hooks/api/inventory/pick-exceptions", () => ({
  ...jest.requireActual("@/hooks/api/inventory/pick-exceptions"),
  useAssignPickException: () => ({ mutate: mockAssignMutate, isPending: false }),
  usePickExceptions: () => ({
    data: { items: [mockException()], total: 1, page: 1, totalPages: 1, openCount: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  ...jest.requireActual("@/hooks/api/inventory/warehouses"),
  useWarehouseAssignees: () => ({ ...mockRoster, refetch: mockRefetch }),
}));

const REVIEW = "inventory:picking:review";
const MANAGE_WAREHOUSE = "inventory:warehouses:manage";

function person(userId: string, name: string) {
  return {
    userId,
    name,
    firstName: null,
    lastName: null,
    email: `${userId}@example.test`,
    image: null,
    grantedBy: "sup",
    grantedByName: "Sup",
    grantedAt: "2026-09-01T00:00:00.000Z",
  };
}

function mockException(over: Partial<PickExceptionSummary> = {}): PickExceptionSummary {
  return {
    pickLineId: 91,
    pickListId: 44,
    pickNumber: "PW-0044",
    soNumber: "SO-1",
    soLineId: 5,
    reason: "SHORT",
    status: "OPEN",
    resolution: null,
    notes: null,
    resolutionNotes: null,
    ownerUserId: "creator",
    ownerName: "Wave Creator",
    reportedBy: "picker",
    reportedByName: "Picker",
    reportedAt: "2026-09-09T09:00:00.000Z",
    resolvedAt: null,
    sku: "SKU-9",
    variantName: "Widget",
    substituteSku: null,
    substituteQuantity: null,
    quantityToPick: "5",
    quantityPicked: "2",
    locationCode: "A-1",
    foundLocationCode: null,
    warehouseId: 7,
    warehouseName: "North DC",
    blocksWave: true,
    ...over,
  };
}

beforeEach(() => {
  mockAssignMutate.mockReset();
  mockRefetch.mockReset();
  mockCan = { [REVIEW]: true, [MANAGE_WAREHOUSE]: true };
  mockRoster = {
    data: {
      items: [person("creator", "Wave Creator"), person("priya", "Priya Nair")],
      total: 2,
      page: 1,
      totalPages: 1,
    },
    isLoading: false,
    isError: false,
    error: null,
  };
});

describe("ExceptionOwnerCell", () => {
  it("hands the exception to the person picked", async () => {
    renderWithProviders(<ExceptionOwnerCell exception={mockException()} />);
    fireEvent.click(screen.getByRole("button", { name: /hand this exception/i }));

    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Priya Nair/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: /Priya Nair/i }));

    await waitFor(() => expect(mockAssignMutate).toHaveBeenCalledTimes(1));
    expect(mockAssignMutate.mock.calls[0]?.[0]).toEqual({
      pickLineId: 91,
      pickListId: 44,
      ownerUserId: "priya",
    });
  });

  it("does not re-post the owner it already has", async () => {
    renderWithProviders(<ExceptionOwnerCell exception={mockException()} />);
    fireEvent.click(screen.getByRole("button", { name: /hand this exception/i }));
    // The trigger also reads "Wave Creator", so the option is addressed by role
    // rather than by text — clicking the trigger again would only close it.
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Wave Creator/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: /Wave Creator/i }));
    expect(mockAssignMutate).not.toHaveBeenCalled();
  });

  it("renders plain text, not a dead control, when the roster cannot be read", () => {
    mockCan = { [REVIEW]: true, [MANAGE_WAREHOUSE]: false };
    renderWithProviders(<ExceptionOwnerCell exception={mockException()} />);
    expect(screen.getByText("Wave Creator")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("is not editable once the exception is resolved", () => {
    renderWithProviders(
      <ExceptionOwnerCell exception={mockException({ status: "RESOLVED" })} />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("is not editable on a row with no warehouse to draw a roster from", () => {
    renderWithProviders(<ExceptionOwnerCell exception={mockException({ warehouseId: null })} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("names an unowned exception rather than showing a blank cell", () => {
    mockCan = { [REVIEW]: true, [MANAGE_WAREHOUSE]: false };
    renderWithProviders(
      <ExceptionOwnerCell exception={mockException({ ownerUserId: null, ownerName: null })} />,
    );
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("distinguishes a roster failure from an empty roster", async () => {
    mockRoster = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Warehouse not found"),
    };
    renderWithProviders(<ExceptionOwnerCell exception={mockException()} />);
    fireEvent.click(screen.getByRole("button", { name: /hand this exception/i }));
    await waitFor(() => expect(screen.getByText("Warehouse not found")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithProviders(<ExceptionOwnerCell exception={mockException()} />);
    await expect(axeViolationIds(container)).resolves.toEqual([]);
  });
});

it("reaches the supervisor from the queue itself, not just in isolation", () => {
  renderWithProviders(<PickExceptionQueue status="OPEN" ownership="ANY" />);
  expect(
    screen.getAllByRole("button", { name: /hand this exception/i }).length,
  ).toBeGreaterThan(0);
});
