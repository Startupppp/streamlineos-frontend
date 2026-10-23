import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KbSharingInventoryTable } from "./kb-sharing-inventory-table";
import { toast } from "sonner";

const bulkRevokeMutate = jest.fn();

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const makeItem = (id: number, type: "guest" | "link") =>
  type === "guest"
    ? {
        id,
        type: "guest" as const,
        page: { id: 100 + id, title: `Page ${id}`, kind: "document", spaceId: null },
        access: "view",
        expiresAt: "2027-01-01T00:00:00Z",
        allowDownload: false,
        lastActivityAt: null,
        status: "active" as const,
        recipient: { email: `guest${id}@example.com`, name: null, portalMembershipId: `pm-${id}` },
      }
    : {
        id,
        type: "link" as const,
        page: { id: 100 + id, title: `Page ${id}`, kind: "document", spaceId: null },
        access: "view",
        expiresAt: "2027-01-01T00:00:00Z",
        allowDownload: false,
        lastActivityAt: null,
        status: "active" as const,
        createdBy: { membershipId: 5 },
      };

jest.mock("@/hooks/api/kb/sharing", () => ({
  useKbSharingInventoryPage: () => ({
    data: {
      data: [makeItem(1, "guest"), makeItem(2, "link")],
      pagination: { limit: 50, hasMore: false, nextCursor: null },
    },
    isLoading: false,
  }),
  useBulkRevokeKbSharing: () => ({ mutate: bulkRevokeMutate, isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/common/use-cursor-pagination", () => ({
  useCursorPagination: () => ({
    cursor: undefined,
    pageNumber: 1,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
    reset: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("KbSharingInventoryTable — renders inventory items", () => {
  it("shows both a guest row and a link row from the inventory response", () => {
    render(<KbSharingInventoryTable />);
    expect(screen.getAllByText("guest1@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Share link").length).toBeGreaterThan(0);
  });

  it("shows the page title for each row", () => {
    render(<KbSharingInventoryTable />);
    expect(screen.getAllByText("Page 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Page 2").length).toBeGreaterThan(0);
  });
});

describe("KbSharingInventoryTable — bulk revoke", () => {
  it("shows a revoke button after selecting a row", async () => {
    const user = userEvent.setup();
    render(<KbSharingInventoryTable />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]!);

    expect(screen.getByRole("button", { name: /revoke selected/i })).toBeInTheDocument();
  });
});
