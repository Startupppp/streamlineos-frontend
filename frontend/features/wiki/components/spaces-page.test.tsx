import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import type { KbSpaceListItem } from "@/hooks/api/kb/spaces";
import SpacesPage from "./spaces-page";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  usePathname: () => "/knowledge/wiki/spaces",
  useSearchParams: () => mockSearchParams,
}));

const mockCan = jest.fn<boolean, [string]>();
const mockAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan(key),
  useAccess: () => mockAccess(),
}));
jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));

const mockSpaces = jest.fn();
const mockArchive = jest.fn();
const mockRestore = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockArchiveImpact = jest.fn();
const mockMembers = jest.fn();

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: (...args: unknown[]) => mockSpaces(...args),
  useArchiveKbSpace: () => mockArchive(),
  useRestoreKbSpace: () => mockRestore(),
  useCreateKbSpace: () => mockCreate(),
  useUpdateKbSpace: () => mockUpdate(),
  useKbSpaceArchiveImpact: () => mockArchiveImpact(),
  useKbSpaceMembers: () => mockMembers(),
}));

function space(over: Partial<KbSpaceListItem> = {}): KbSpaceListItem {
  return {
    id: 1,
    name: "Engineering",
    slug: "engineering",
    description: "For engineers",
    audience: "internal",
    icon: "🔧",
    isPublicHelpCenter: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    archivedAt: null,
    articleCount: 0,
    pageCount: 12,
    memberCount: 5,
    ownerName: null,
    pagesOverdueForReview: 0,
    ...over,
  };
}

function listing(rows: KbSpaceListItem[], over: Record<string, unknown> = {}) {
  return {
    data: { data: rows, pagination: { limit: 30, hasMore: false, nextCursor: null } },
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

const accessGranted = { data: { isOrgOwner: true, scopes: {}, modules: {} }, isLoading: false };
const accessDenied = { data: { isOrgOwner: false, scopes: {}, modules: {} }, isLoading: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockCan.mockReturnValue(false);
  mockAccess.mockReturnValue(accessGranted);
  mockSpaces.mockReturnValue(listing([space()]));
  mockArchive.mockReturnValue(mutation());
  mockRestore.mockReturnValue(mutation());
  mockCreate.mockReturnValue(mutation());
  mockUpdate.mockReturnValue(mutation());
  mockArchiveImpact.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  mockMembers.mockReturnValue({ data: undefined, isLoading: false, isError: false });
});

describe("SpacesPage", () => {
  it("renders a space card with name, page count and member count when the list has entries", () => {
    render(<SpacesPage />);

    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText(/12 pages/)).toBeInTheDocument();
    expect(screen.getByText(/5 members/)).toBeInTheDocument();
  });

  it("shows the loading skeleton while the request is in flight, and not the empty state", () => {
    mockSpaces.mockReturnValue(listing([], { data: undefined, isLoading: true }));

    render(<SpacesPage />);

    expect(screen.queryByText("No spaces yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
  });

  it("shows the empty state with no create button for a viewer when the list is empty", () => {
    mockSpaces.mockReturnValue(listing([]));

    render(<SpacesPage />);

    expect(screen.getByText("No spaces yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New space" })).not.toBeInTheDocument();
  });

  it("shows the empty state with a create button for a manager when the list is empty", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    mockSpaces.mockReturnValue(listing([]));

    render(<SpacesPage />);

    expect(screen.getByText("No spaces yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create space" })).toBeInTheDocument();
  });

  it("shows the error state and offers a retry when the request fails", () => {
    mockSpaces.mockReturnValue(
      listing([], {
        data: undefined,
        isError: true,
        error: new ApiError("Down", 500, "INTERNAL", {}, "/kb/spaces"),
      }),
    );

    render(<SpacesPage />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("No spaces yet")).not.toBeInTheDocument();
  });

  it("shows the filtered empty state with a clear-filters button when search produces no results", async () => {
    mockSearchParams = new URLSearchParams("q=xyz");
    mockSpaces.mockReturnValue(listing([]));

    render(<SpacesPage />);

    expect(screen.getByText("No spaces match your filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("shows the New space button only when the user can manage spaces", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");

    render(<SpacesPage />);

    expect(screen.getByRole("button", { name: /New space/i })).toBeInTheDocument();
  });

  it("does not show the New space button when the user cannot manage spaces", () => {
    render(<SpacesPage />);

    expect(screen.queryByRole("button", { name: /New space/i })).not.toBeInTheDocument();
  });

  it("shows Edit, Members and Archive buttons on each card for a manager", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");

    render(<SpacesPage />);

    expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archive/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Members/i })).toBeInTheDocument();
  });

  it("BITE: shows the owner and last-updated line on each card", () => {
    mockSpaces.mockReturnValue(listing([space({ ownerName: "Priya Shah" })]));

    render(<SpacesPage />);

    expect(screen.getByText(/Owned by Priya Shah/)).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it("BITE: shows an overdue-for-review health badge to a manager, and hides it from a non-manager", () => {
    mockSpaces.mockReturnValue(listing([space({ pagesOverdueForReview: 3 })]));
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");

    const { rerender } = render(<SpacesPage />);
    expect(screen.getByText(/3 pages overdue for review/)).toBeInTheDocument();

    mockCan.mockReturnValue(false);
    rerender(<SpacesPage />);
    expect(screen.queryByText(/overdue for review/)).not.toBeInTheDocument();
  });

  it("opens the members sheet for the clicked card when Members is pressed", async () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    render(<SpacesPage />);

    await userEvent.click(screen.getByRole("button", { name: /Members/i }));

    expect(screen.getByText("Members — Engineering")).toBeInTheDocument();
  });

  it("shows the next-page button when the server signals there are more results", () => {
    mockSpaces.mockReturnValue({
      data: { data: [space()], pagination: { limit: 30, hasMore: true, nextCursor: "c2" } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<SpacesPage />);

    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("passes the active filters to the spaces hook", () => {
    mockSearchParams = new URLSearchParams("audience=public&status=archived");

    render(<SpacesPage />);

    expect(mockSpaces).toHaveBeenCalledWith(
      expect.objectContaining({ audience: "public", archived: true }),
    );
  });
});

describe("SpacesPage — card/list view", () => {
  it("BITE: renders the spaces as a table when the URL asks for the list view", () => {
    mockSearchParams = new URLSearchParams("view=list");

    render(<SpacesPage />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Engineering")).toBeInTheDocument();
    expect(within(table).getByText("Internal")).toBeInTheDocument();
  });

  it("BITE: the view toggle reflects the list view selected in the URL", () => {
    mockSearchParams = new URLSearchParams("view=list");

    render(<SpacesPage />);

    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps the card grid as the default view when the URL names no view", () => {
    render(<SpacesPage />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });
});
