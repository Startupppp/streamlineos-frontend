import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
const mockDelete = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockArchiveImpact = jest.fn();
const mockMembers = jest.fn();
const mockAddMember = jest.fn();
const mockRemoveMember = jest.fn();

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: (...args: unknown[]) => mockSpaces(...args),
  useArchiveKbSpace: () => mockArchive(),
  useRestoreKbSpace: () => mockRestore(),
  useDeleteKbSpace: () => mockDelete(),
  useCreateKbSpace: () => mockCreate(),
  useUpdateKbSpace: () => mockUpdate(),
  useKbSpaceArchiveImpact: () => mockArchiveImpact(),
  useKbSpaceMembers: () => mockMembers(),
  useAddKbSpaceMember: () => mockAddMember(),
  useRemoveKbSpaceMember: () => mockRemoveMember(),
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

function pageTree(client: QueryClient) {
  return (
    <QueryClientProvider client={client}>
      <SpacesPage />
    </QueryClientProvider>
  );
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(pageTree(client));
  return { ...result, rerenderPage: () => result.rerender(pageTree(client)) };
}

const accessGranted = { data: { isOrgOwner: true, scopes: {}, modules: {} }, isLoading: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockCan.mockReturnValue(false);
  mockAccess.mockReturnValue(accessGranted);
  mockSpaces.mockReturnValue(listing([space()]));
  mockArchive.mockReturnValue(mutation());
  mockRestore.mockReturnValue(mutation());
  mockDelete.mockReturnValue(mutation());
  mockCreate.mockReturnValue(mutation());
  mockUpdate.mockReturnValue(mutation());
  mockArchiveImpact.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  mockMembers.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  mockAddMember.mockReturnValue(mutation());
  mockRemoveMember.mockReturnValue(mutation());
});

describe("SpacesPage", () => {
  it("renders a space card with name, page count and member count when the list has entries", () => {
    renderPage();

    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText(/12 pages/)).toBeInTheDocument();
    expect(screen.getByText(/5 members/)).toBeInTheDocument();
  });

  it("shows the loading skeleton while the request is in flight, and not the empty state", () => {
    mockSpaces.mockReturnValue(listing([], { data: undefined, isLoading: true }));

    renderPage();

    expect(screen.queryByText("No spaces yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
  });

  it("shows the empty state with no create button for a viewer when the list is empty", () => {
    mockSpaces.mockReturnValue(listing([]));

    renderPage();

    expect(screen.getByText("No spaces yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New space" })).not.toBeInTheDocument();
  });

  it("shows the empty state with a create button for a manager when the list is empty", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    mockSpaces.mockReturnValue(listing([]));

    renderPage();

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

    renderPage();

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("No spaces yet")).not.toBeInTheDocument();
  });

  it("shows the filtered empty state with a clear-filters button when search produces no results", async () => {
    mockSearchParams = new URLSearchParams("q=xyz");
    mockSpaces.mockReturnValue(listing([]));

    renderPage();

    expect(screen.getByText("No spaces match your filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("shows the New space button only when the user can manage spaces", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");

    renderPage();

    expect(screen.getByRole("button", { name: /New space/i })).toBeInTheDocument();
  });

  it("does not show the New space button when the user cannot manage spaces", () => {
    renderPage();

    expect(screen.queryByRole("button", { name: /New space/i })).not.toBeInTheDocument();
  });

  it("shows Edit, Members and Archive buttons on each card for a manager", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");

    renderPage();

    expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archive/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Members/i })).toBeInTheDocument();
  });

  it("offers Delete permanently only on an archived space", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    mockSpaces.mockReturnValue(
      listing([space(), space({ id: 2, name: "Old handbook", archivedAt: "2026-10-01T00:00:00.000Z" })]),
    );

    renderPage();

    expect(screen.getAllByRole("button", { name: "Delete permanently" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^Archive$/ })).toHaveLength(1);
  });

  it("hides Delete permanently from a user who cannot manage spaces", () => {
    mockSpaces.mockReturnValue(listing([space({ archivedAt: "2026-10-01T00:00:00.000Z" })]));

    renderPage();

    expect(screen.queryByRole("button", { name: "Delete permanently" })).not.toBeInTheDocument();
  });

  it("confirms how many pages move to Trash, then deletes the clicked archived space and closes", async () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    mockSpaces.mockReturnValue(
      listing([space({ id: 2, name: "Old handbook", archivedAt: "2026-10-01T00:00:00.000Z" })]),
    );
    mockArchiveImpact.mockReturnValue({
      data: { pageCount: 4, publicLinkCount: 0, recordLinkCount: 0, askIndexed: false },
      isLoading: false,
      isError: false,
    });
    const mutate = jest.fn((_id: number, options: { onSuccess: () => void }) => options.onSuccess());
    mockDelete.mockReturnValue(mutation({ mutate }));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Delete permanently" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/4 pages will move to Trash/)).toBeInTheDocument();
    expect(within(dialog).getByText(/restored from Trash to the Wiki root/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Delete permanently" }));

    expect(mutate).toHaveBeenCalledWith(2, expect.any(Object));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the delete dialog open and reports the error when the server refuses", async () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    mockSpaces.mockReturnValue(
      listing([space({ id: 2, name: "Old handbook", archivedAt: "2026-10-01T00:00:00.000Z" })]),
    );
    const mutate = jest.fn((_id: number, options: { onError: (e: unknown) => void }) =>
      options.onError(new ApiError("Archive this space before deleting it permanently.", 409, "KB_SPACE_NOT_ARCHIVED", {}, "/kb/spaces/2")),
    );
    mockDelete.mockReturnValue(mutation({ mutate }));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Delete permanently" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete permanently" }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("keeps card actions outside the space link and reachable in keyboard order", async () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    const user = userEvent.setup();
    renderPage();

    const link = screen.getByRole("link", { name: "Open Engineering" });
    const members = screen.getByRole("button", { name: "Members" });
    const edit = screen.getByRole("button", { name: "Edit" });
    expect(link).toHaveAttribute("href", "/knowledge/wiki/spaces/1");
    expect(link).not.toContainElement(members);
    expect(link).not.toContainElement(edit);
    expect(members.parentElement).toHaveClass("flex-wrap");

    link.focus();
    await user.tab();
    expect(members).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Members — Engineering")).toBeInTheDocument();
  });

  it("KB-B-029: Edit seeds the sheet with the clicked space, after a create was opened first", async () => {
    mockCan.mockReturnValue(true);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /New space/i }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Engineering");
    expect(screen.getByLabelText("Description")).toHaveValue("For engineers");
  });

  it("KB-B-001/026: Create omits empty description and icon instead of sending null", async () => {
    mockCan.mockReturnValue(true);
    const create = mutation();
    mockCreate.mockReturnValue(create);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /New space/i }));
    await userEvent.type(screen.getByLabelText("Name"), "Ops");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(create.mutate).toHaveBeenCalledWith(
      { name: "Ops", description: undefined, icon: undefined, audience: "internal" },
      expect.anything(),
    );
  });

  it("KB-B-001: Edit sends null for a cleared description so the field is cleared", async () => {
    mockCan.mockReturnValue(true);
    const update = mutation();
    mockUpdate.mockReturnValue(update);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.clear(screen.getByLabelText("Description"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(update.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 1, description: null, icon: "🔧" }),
      expect.anything(),
    );
  });

  it("BITE: shows the owner and last-updated line on each card", () => {
    mockSpaces.mockReturnValue(listing([space({ ownerName: "Priya Shah" })]));

    renderPage();

    expect(screen.getByText(/Owned by Priya Shah/)).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it("BITE: shows an overdue-for-review health badge to a manager, and hides it from a non-manager", () => {
    mockSpaces.mockReturnValue(listing([space({ pagesOverdueForReview: 3 })]));
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");

    const { rerenderPage } = renderPage();
    expect(screen.getByText(/3 pages overdue for review/)).toBeInTheDocument();

    mockCan.mockReturnValue(false);
    rerenderPage();
    expect(screen.queryByText(/overdue for review/)).not.toBeInTheDocument();
  });

  it("opens the members sheet for the clicked card when Members is pressed", async () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /Members/i }));

    expect(screen.getByText("Members — Engineering")).toBeInTheDocument();
  });

  it("restores the cursor from the URL after navigation and clears it with the old trail when a filter changes", async () => {
    mockSpaces.mockReturnValue({
      data: { data: [space()], pagination: { limit: 30, hasMore: true, nextCursor: "c2" } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { rerenderPage } = renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    const nextUrl = new URL(mockReplace.mock.lastCall?.[0], "http://localhost");
    expect(nextUrl.searchParams.get("cursor")).toBe("c2");
    expect(JSON.parse(nextUrl.searchParams.get("cursorTrail") ?? "")).toEqual([null]);

    mockSearchParams = nextUrl.searchParams;
    rerenderPage();

    expect(mockSpaces).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "c2" }),
    );

    await userEvent.type(screen.getByPlaceholderText("Search spaces…"), "eng");
    const filteredUrl = new URL(mockReplace.mock.lastCall?.[0], "http://localhost");
    expect(filteredUrl.searchParams.get("cursor")).toBeNull();
    expect(filteredUrl.searchParams.get("cursorTrail")).toBeNull();
  });

  it("keeps cursor navigation in the URL and preserves it when changing the view", async () => {
    mockSpaces.mockReturnValue(listing([space()], {
      data: { data: [space()], pagination: { limit: 30, hasMore: true, nextCursor: "c2" } },
    }));
    mockSearchParams = new URLSearchParams("audience=internal&cursor=c2&cursorTrail=%5Bnull%5D");
    const { rerenderPage } = renderPage();

    expect(mockSpaces).toHaveBeenLastCalledWith(
      expect.objectContaining({ audience: "internal", cursor: "c2" }),
    );
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "List view" }));
    const listUrl = new URL(mockReplace.mock.lastCall?.[0], "http://localhost");
    expect(listUrl.searchParams.get("view")).toBe("list");
    expect(listUrl.searchParams.get("cursor")).toBe("c2");
    expect(listUrl.searchParams.get("cursorTrail")).toBe("[null]");

    mockSearchParams = listUrl.searchParams;
    rerenderPage();
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    const previousUrl = new URL(mockReplace.mock.lastCall?.[0], "http://localhost");
    expect(previousUrl.searchParams.get("view")).toBe("list");
    expect(previousUrl.searchParams.get("audience")).toBe("internal");
    expect(previousUrl.searchParams.get("cursor")).toBeNull();
    expect(previousUrl.searchParams.get("cursorTrail")).toBeNull();
  });

  it("shows the next-page button when the server signals there are more results", () => {
    mockSpaces.mockReturnValue({
      data: { data: [space()], pagination: { limit: 30, hasMore: true, nextCursor: "c2" } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    renderPage();

    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("passes the active filters to the spaces hook", () => {
    mockSearchParams = new URLSearchParams("audience=public&status=archived");

    renderPage();

    expect(mockSpaces).toHaveBeenCalledWith(
      expect.objectContaining({ audience: "public", archived: true }),
    );
  });
});

describe("SpacesPage — card/list view", () => {
  it("keeps list view's 375px mobile card actions separate from its link", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    mockSearchParams = new URLSearchParams("view=list");
    renderPage();

    const mobileLink = screen.getByRole("link", { name: "Open Engineering" });
    expect(mobileLink).not.toContainElement(screen.getByRole("button", { name: "Members" }));
    expect(within(screen.getByRole("table")).getByRole("button", { name: "Members of Engineering" })).toBeInTheDocument();
  });

  it("BITE: renders the spaces as a table when the URL asks for the list view", () => {
    mockSearchParams = new URLSearchParams("view=list");

    renderPage();

    const table = screen.getByRole("table");
    expect(within(table).getByText("Engineering")).toBeInTheDocument();
    expect(within(table).getByText("Internal")).toBeInTheDocument();
  });

  it("BITE: the view toggle reflects the list view selected in the URL", () => {
    mockSearchParams = new URLSearchParams("view=list");

    renderPage();

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
    renderPage();

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });
});
