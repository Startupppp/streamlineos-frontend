import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import type { LinkedDocumentItem } from "@/hooks/api/kb/linked-documents";
import CompanyDocumentsPage from "./company-documents-page";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  usePathname: () => "/knowledge/wiki/company-documents",
  useSearchParams: () => mockSearchParams,
}));

const mockCan = jest.fn<boolean, [string]>();
const mockAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key), useAccess: () => mockAccess() }));
jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));

const mockConfig = jest.fn();
jest.mock("@/hooks/api/kb/hr-link-config", () => ({ useHrKbLinkConfig: () => mockConfig() }));

const mockList = jest.fn();
jest.mock("@/hooks/api/kb/linked-documents", () => ({ useLinkedDocuments: (...args: unknown[]) => mockList(...args) }));

function item(over: Partial<LinkedDocumentItem> = {}): LinkedDocumentItem {
  return {
    id: 31,
    name: "Code of Conduct",
    description: null,
    category: "Policies",
    tags: [],
    documentType: "POLICY",
    effectiveDate: "2026-04-01",
    version: 3,
    publishedAt: "2026-09-01T00:00:00.000Z",
    source: "HR_DOCUMENT",
    hasFile: true,
    fileName: "coc.pdf",
    fileSize: 100,
    mimeType: "application/pdf",
    status: "active",
    versionMode: "FOLLOW_LATEST",
    pinnedVersion: null,
    ...over,
  };
}

function listing(rows: LinkedDocumentItem[], over: Record<string, unknown> = {}) {
  return {
    data: { data: rows, pagination: { limit: 30, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  };
}

function linkSwitch(link: boolean | undefined, over: Record<string, unknown> = {}) {
  mockConfig.mockReturnValue({
    data: link === undefined ? undefined : { link, search: false, ai: false },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  });
}

const ON = { enabled: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockCan.mockReturnValue(false);
  mockAccess.mockReturnValue({ data: { isOrgOwner: true, scopes: {}, modules: {} }, isLoading: false });
  linkSwitch(true);
  mockList.mockReturnValue(listing([item()]));
});

describe("CompanyDocumentsPage", () => {
  it("lists what the reader may open, each row marked as an HR document and linking to its entry", () => {
    render(<CompanyDocumentsPage />);

    expect(screen.getAllByRole("link", { name: "Code of Conduct" })[0]).toHaveAttribute("href", "/knowledge/wiki/company-documents/31");
    expect(screen.getAllByText("HR document").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Policies").length).toBeGreaterThan(0);
    expect(screen.getAllByText("v3").length).toBeGreaterThan(0);
  });

  it("asks only for live entries when the reader is not a publisher, whatever the URL says", () => {
    mockSearchParams = new URLSearchParams("status=all&cursor=publisher-page");

    render(<CompanyDocumentsPage />);

    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "active", cursor: undefined }), ON);
    expect(screen.queryByRole("combobox", { name: "Show entries" })).not.toBeInTheDocument();
  });

  it("lets a publisher list entries that are no longer live, and marks them", () => {
    mockCan.mockImplementation((key) => key === "hr:documents:publish");
    mockSearchParams = new URLSearchParams("status=unpublished");
    mockList.mockReturnValue(listing([item({ status: "unpublished" })]));

    render(<CompanyDocumentsPage />);

    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "unpublished" }), ON);
    expect(screen.getByRole("combobox", { name: "Show entries" })).toBeInTheDocument();
    expect(screen.getAllByText("Withdrawn").length).toBeGreaterThan(0);
  });

  it("falls back to live entries for a status it does not know", () => {
    mockCan.mockImplementation((key) => key === "hr:documents:publish");
    mockSearchParams = new URLSearchParams("status=banana");

    render(<CompanyDocumentsPage />);

    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }), ON);
  });

  it("explains an empty list instead of showing an empty table", () => {
    mockList.mockReturnValue(listing([]));

    render(<CompanyDocumentsPage />);

    expect(screen.getByText("No company documents yet")).toBeInTheDocument();
    expect(screen.getByText("Company documents that HR shares with you will appear here.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("offers to clear the status filter when a publisher's filter finds nothing, instead of claiming nothing was ever shared", async () => {
    mockCan.mockImplementation((key) => key === "hr:documents:publish");
    mockSearchParams = new URLSearchParams("status=source_removed&cursor=old-page&cursorTrail=%5Bnull%5D");
    mockList.mockReturnValue(listing([]));

    render(<CompanyDocumentsPage />);

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByText("No company documents yet")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(mockReplace).toHaveBeenCalledWith(expect.not.stringContaining("status="), expect.anything());
    const clearedUrl = new URL(mockReplace.mock.lastCall?.[0], "http://localhost");
    expect(clearedUrl.searchParams.get("cursor")).toBeNull();
    expect(clearedUrl.searchParams.get("cursorTrail")).toBeNull();
  });

  it("titles a withdrawn entry whose document can no longer be shared as hidden, not as removed", () => {
    mockCan.mockImplementation((key) => key === "hr:documents:publish");
    mockList.mockReturnValue(listing([item({ id: 32, name: null, status: "unpublished", hasFile: false }), item({ id: 33, name: null, status: "source_removed", hasFile: false })]));

    render(<CompanyDocumentsPage />);

    expect(screen.getAllByText("Details no longer shown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Removed document").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Withdrawn").length).toBeGreaterThan(0);
  });

  it("shows a skeleton while loading", () => {
    mockList.mockReturnValue(listing([], { data: undefined, isLoading: true }));

    render(<CompanyDocumentsPage />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Code of Conduct" })).not.toBeInTheDocument();
    expect(screen.queryByText("No company documents yet")).not.toBeInTheDocument();
  });

  it("restores the keyset cursor from the URL and returns to the previous page", async () => {
    mockList.mockReturnValue(listing([item()], { data: { data: [item()], pagination: { limit: 30, hasMore: true, nextCursor: "cur-2" } } }));

    const view = render(<CompanyDocumentsPage />);
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    const nextUrl = new URL(mockReplace.mock.lastCall?.[0], "http://localhost");
    expect(nextUrl.searchParams.get("cursor")).toBe("cur-2");
    expect(JSON.parse(nextUrl.searchParams.get("cursorTrail") ?? "")).toEqual([null]);

    mockSearchParams = nextUrl.searchParams;
    view.rerender(<CompanyDocumentsPage />);
    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "cur-2" }), ON);
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    const previousUrl = new URL(mockReplace.mock.lastCall?.[0], "http://localhost");
    expect(previousUrl.searchParams.get("cursor")).toBeNull();
    expect(previousUrl.searchParams.get("cursorTrail")).toBeNull();
  });

  it("uses a bookmarked publisher status and cursor together", () => {
    mockCan.mockImplementation((key) => key === "hr:documents:publish");
    mockSearchParams = new URLSearchParams("status=unpublished&cursor=cur-2&cursorTrail=%5Bnull%5D");

    render(<CompanyDocumentsPage />);

    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "unpublished", cursor: "cur-2" }), ON);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
  });

  it("says company documents are not turned on, and does not ask for the list, while the switch is off", () => {
    linkSwitch(false);
    mockList.mockReturnValue(listing([], { data: undefined }));

    render(<CompanyDocumentsPage />);

    expect(screen.getByText("Company documents are not turned on")).toBeInTheDocument();
    expect(screen.queryByText("No company documents yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith(expect.anything(), { enabled: false });
    expect(mockList).not.toHaveBeenCalledWith(expect.anything(), ON);
  });

  it("does not list what it still holds from before the switch was turned off, and offers a publisher no status filter", () => {
    mockCan.mockImplementation((key) => key === "hr:documents:publish");
    linkSwitch(false);

    render(<CompanyDocumentsPage />);

    expect(screen.getByText("Company documents are not turned on")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Code of Conduct" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Show entries" })).not.toBeInTheDocument();
  });

  it("waits for the switch before deciding anything, and does not ask for the list until it is on", () => {
    linkSwitch(undefined, { isLoading: true });
    mockList.mockReturnValue(listing([], { data: undefined }));

    render(<CompanyDocumentsPage />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Company documents are not turned on")).not.toBeInTheDocument();
    expect(screen.queryByText("No company documents yet")).not.toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith(expect.anything(), { enabled: false });
  });

  it("reports an error, and retries the switch rather than the list, when the switch cannot be read", async () => {
    const refetchSwitch = jest.fn();
    const refetchList = jest.fn();
    linkSwitch(undefined, { isError: true, error: new ApiError("Down", 500, "INTERNAL", {}, "/kb/hr-link/config"), refetch: refetchSwitch });
    mockList.mockReturnValue(listing([], { data: undefined, refetch: refetchList }));

    render(<CompanyDocumentsPage />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Company documents are not turned on")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetchSwitch).toHaveBeenCalledTimes(1);
    expect(refetchList).not.toHaveBeenCalled();
  });

  it("reports a failed list as an error, and retries the list, when the switch is on", async () => {
    const refetchList = jest.fn();
    mockList.mockReturnValue(
      listing([], { data: undefined, isError: true, error: new ApiError("Boom", 500, "INTERNAL", {}, "/kb/linked-documents"), refetch: refetchList }),
    );

    render(<CompanyDocumentsPage />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Company documents are not turned on")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetchList).toHaveBeenCalledTimes(1);
  });
});
