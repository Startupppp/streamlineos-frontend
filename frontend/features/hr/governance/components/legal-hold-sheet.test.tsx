import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { LegalHoldSheet } from "./legal-hold-sheet";
import type { LegalHold } from "../hooks/use-legal-holds";

const HOOKS = join(process.cwd(), "features/hr/governance/hooks/use-legal-holds.ts");

const holdItems = jest.fn();
const refetch = jest.fn();
const canState = jest.fn(() => "granted");

jest.mock("../hooks/use-legal-holds", () => ({
  useHoldItems: () => holdItems(),
  useCreateLegalHold: () => ({ mutate: jest.fn(), isPending: false }),
  useAttachHoldItem: () => ({ mutate: jest.fn(), isPending: false }),
  useDetachHoldItem: () => ({ mutate: jest.fn(), isPending: false, variables: undefined }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: { data: [] } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => canState(),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: () => <div data-testid="user-combobox" />,
}));

const hold: LegalHold = {
  id: 42,
  orgId: "org-1",
  status: "active",
  reason: "Pending litigation",
  subjectUserId: "u1",
  placedBy: "u0",
  placedAt: "2026-01-02T00:00:00.000Z",
  releasedBy: null,
  releasedAt: null,
  restrictedExport: true,
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function noop(): void {}

function renderSheet() {
  return render(<LegalHoldSheet open onClose={noop} hold={hold} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  canState.mockReturnValue("granted");
  holdItems.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS-B3-020 an unreadable legal hold must never look like a hold covering nothing", () => {
  it("keeps the failed hold-items read inline instead of throwing it to the /hr boundary", () => {
    const source = readFileSync(HOOKS, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(source).toContain("...INLINE_READ_ERROR,");
  });

  it("says the items could not be loaded, on the sheet itself, when the read 500s", () => {
    holdItems.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    renderSheet();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load hold items/i);
  });

  it("does not tell the operator the hold covers no items while the read is erroring, which is what could get held data deleted", () => {
    holdItems.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    renderSheet();

    expect(screen.queryByText(/no items attached to this hold/i)).toBeNull();
  });

  it("retries the hold-items read itself", () => {
    holdItems.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("distinguishes an undetermined hold from an empty one when the read resolved to nothing", () => {
    holdItems.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    renderSheet();

    expect(screen.getByText(/hold coverage could not be determined/i)).toBeInTheDocument();
    expect(screen.queryByText(/no items attached to this hold/i)).toBeNull();
  });

  it("says access is restricted rather than empty when hr:legalhold:view is denied (FE-49)", () => {
    canState.mockReturnValue("denied");
    renderSheet();

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText(/no items attached to this hold/i)).toBeNull();
  });

  it("still shows the honest empty state when the hold genuinely covers no items", () => {
    renderSheet();

    expect(screen.getByText(/no items attached to this hold/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still lists the items a readable hold covers", () => {
    holdItems.mockReturnValue({
      data: [{ id: 1, itemType: "document", itemRef: "doc-7" }],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    renderSheet();

    expect(screen.getByText("doc-7")).toBeInTheDocument();
  });
});

describe("the failed read's request id is quotable to support", () => {
  it("renders the copyable reference the backend echoed on the error envelope", () => {
    holdItems.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, { correlationId: "req-abc123" }),
      refetch,
    });
    renderSheet();
    expect(screen.getByText(/reference/i)).toBeInTheDocument();
    expect(screen.getByText("req-abc123")).toBeInTheDocument();
  });
});
