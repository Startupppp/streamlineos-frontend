import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));

const mockList = jest.fn();
jest.mock("@/hooks/api/kb/linked-documents", () => ({ useLinkedDocuments: (...args: unknown[]) => mockList(...args) }));

const mockPageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: (...args: unknown[]) => mockPageState(...args) }));
jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, empty, children }: { resolution: { kind: string }; loading: React.ReactNode; empty?: React.ReactNode; children: React.ReactNode }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "empty") return <>{empty ?? children}</>;
    return <>{children}</>;
  },
}));

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

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockCan.mockReturnValue(false);
  mockPageState.mockReturnValue({ kind: "ready" });
  mockList.mockReturnValue(listing([item()]));
});

describe("CompanyDocumentsPage", () => {
  it("lists what the reader may open, each row marked as an HR document and linking to its entry", () => {
    render(<CompanyDocumentsPage />);

    expect(screen.getByRole("link", { name: "Code of Conduct" })).toHaveAttribute("href", "/knowledge/wiki/company-documents/31");
    expect(screen.getByText("HR document")).toBeInTheDocument();
    expect(screen.getByText("Policies")).toBeInTheDocument();
    expect(screen.getByText("v3")).toBeInTheDocument();
  });

  it("asks only for live entries when the reader is not a publisher, whatever the URL says", () => {
    mockSearchParams = new URLSearchParams("status=all");

    render(<CompanyDocumentsPage />);

    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }));
    expect(screen.queryByRole("combobox", { name: "Show entries" })).not.toBeInTheDocument();
  });

  it("lets a publisher list entries that are no longer live, and marks them", () => {
    mockCan.mockImplementation((key) => key === "hr:documents:publish");
    mockSearchParams = new URLSearchParams("status=unpublished");
    mockList.mockReturnValue(listing([item({ status: "unpublished" })]));

    render(<CompanyDocumentsPage />);

    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "unpublished" }));
    expect(screen.getByRole("combobox", { name: "Show entries" })).toBeInTheDocument();
    // Once as the filter's current value, once as the badge on the row.
    expect(screen.getAllByText("Withdrawn")).toHaveLength(2);
  });

  it("falls back to live entries for a status it does not know", () => {
    mockCan.mockImplementation((key) => key === "hr:documents:publish");
    mockSearchParams = new URLSearchParams("status=banana");

    render(<CompanyDocumentsPage />);

    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }));
  });

  it("explains an empty list instead of showing an empty table", () => {
    mockList.mockReturnValue(listing([]));
    mockPageState.mockReturnValue({ kind: "empty" });

    render(<CompanyDocumentsPage />);

    expect(screen.getByText("No company documents yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("offers to clear the status filter when a publisher's filter finds nothing, instead of claiming nothing was ever shared", async () => {
    mockCan.mockImplementation((key) => key === "hr:documents:publish");
    mockSearchParams = new URLSearchParams("status=source_removed");
    mockList.mockReturnValue(listing([]));
    mockPageState.mockReturnValue({ kind: "empty" });

    render(<CompanyDocumentsPage />);

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByText("No company documents yet")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(mockReplace).toHaveBeenCalledWith(expect.not.stringContaining("status="), expect.anything());
  });

  it("titles a withdrawn entry whose document can no longer be shared as hidden, not as removed", () => {
    mockCan.mockImplementation((key) => key === "hr:documents:publish");
    mockList.mockReturnValue(listing([item({ id: 32, name: null, status: "unpublished", hasFile: false }), item({ id: 33, name: null, status: "source_removed", hasFile: false })]));
    mockPageState.mockReturnValue({ kind: "ready" });

    render(<CompanyDocumentsPage />);

    expect(screen.getAllByText("Details no longer shown")).toHaveLength(1);
    expect(screen.getAllByText("Removed document")).toHaveLength(1);
    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
  });

  it("shows a skeleton while loading", () => {
    mockList.mockReturnValue(listing([], { data: undefined, isLoading: true }));
    mockPageState.mockReturnValue({ kind: "loading" });

    render(<CompanyDocumentsPage />);

    expect(screen.queryByRole("link", { name: "Code of Conduct" })).not.toBeInTheDocument();
  });

  it("passes the keyset cursor to the next page", async () => {
    mockList.mockReturnValue(listing([item()], { data: { data: [item()], pagination: { limit: 30, hasMore: true, nextCursor: "cur-2" } } }));

    render(<CompanyDocumentsPage />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "cur-2" }));
  });
});
