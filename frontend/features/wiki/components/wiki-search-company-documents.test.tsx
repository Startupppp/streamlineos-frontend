import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import type { LinkedDocumentItem } from "@/hooks/api/kb/linked-documents";
import { WikiSearchCompanyDocuments } from "./wiki-search-company-documents";

const mockFlags = jest.fn();
jest.mock("@/hooks/api/kb/hr-link-config", () => ({ useHrKbLinkFlags: () => mockFlags() }));

const mockList = jest.fn();
jest.mock("@/hooks/api/kb/linked-documents", () => ({ useLinkedDocuments: (...args: unknown[]) => mockList(...args) }));

function item(over: Partial<LinkedDocumentItem> = {}): LinkedDocumentItem {
  return {
    id: 31,
    name: "Leave Policy",
    description: null,
    category: "Policies",
    tags: [],
    documentType: "POLICY",
    effectiveDate: "2026-04-01",
    version: 3,
    publishedAt: "2026-09-01T00:00:00.000Z",
    source: "HR_DOCUMENT",
    hasFile: true,
    fileName: "leave.pdf",
    fileSize: 100,
    mimeType: "application/pdf",
    status: "active",
    versionMode: "FOLLOW_LATEST",
    pinnedVersion: null,
    ...over,
  };
}

const page = (rows: LinkedDocumentItem[], pagination = { limit: 10, hasMore: false, nextCursor: null as string | null }) => ({
  data: { data: rows, pagination },
  isError: false,
  error: null,
  refetch: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFlags.mockReturnValue({ link: true, search: true, ai: false });
  mockList.mockReturnValue(page([item()]));
});

describe("WikiSearchCompanyDocuments", () => {
  it("lists the company documents that match, each marked as an HR document and linking to its entry", () => {
    render(<WikiSearchCompanyDocuments query="leave" />);

    expect(screen.getByRole("heading", { name: "Company documents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /leave policy/i })).toHaveAttribute("href", "/knowledge/wiki/company-documents/31");
    expect(screen.getByText("HR document")).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ q: "leave", limit: 10 }), { enabled: true });
  });

  it("renders nothing, and does not ask, while search is switched off", () => {
    mockFlags.mockReturnValue({ link: true, search: false, ai: false });

    const { container } = render(<WikiSearchCompanyDocuments query="leave" />);

    expect(container).toBeEmptyDOMElement();
    expect(mockList).toHaveBeenCalledWith(expect.anything(), { enabled: false });
  });

  it("does not ask for a query of one character, which the server would refuse", () => {
    const { container } = render(<WikiSearchCompanyDocuments query=" a " />);

    expect(container).toBeEmptyDOMElement();
    expect(mockList).toHaveBeenCalledWith(expect.anything(), { enabled: false });
  });

  it("renders nothing when nothing matches, rather than a heading with nothing under it", () => {
    mockList.mockReturnValue(page([]));

    const { container } = render(<WikiSearchCompanyDocuments query="leave" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows a skeleton, not a heading, until the first answer", () => {
    mockList.mockReturnValue({ data: undefined, isError: false, error: null, refetch: jest.fn() });

    render(<WikiSearchCompanyDocuments query="leave" />);

    expect(screen.queryByRole("heading", { name: "Company documents" })).not.toBeInTheDocument();
  });

  it("pages with its own cursor, and only offers Next when the server says there is more", async () => {
    mockList.mockReturnValue(page([item()], { limit: 10, hasMore: true, nextCursor: "cur-2" }));

    render(<WikiSearchCompanyDocuments query="leave" />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "cur-2", q: "leave" }), { enabled: true });
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  it("offers no paging when everything fits on one page", () => {
    render(<WikiSearchCompanyDocuments query="leave" />);

    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("goes back to the first page when the words change", async () => {
    mockList.mockReturnValue(page([item()], { limit: 10, hasMore: true, nextCursor: "cur-2" }));

    const { rerender } = render(<WikiSearchCompanyDocuments query="leave" />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    rerender(<WikiSearchCompanyDocuments query="travel" />);

    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ q: "travel", cursor: undefined }), { enabled: true });
  });

  it("shows the message and a copyable reference when the search fails, and retries", async () => {
    const refetch = jest.fn();
    mockList.mockReturnValue({ data: undefined, isError: true, error: new ApiError("Server error", 500, "INTERNAL", { correlationId: "req-8c" }, "/kb/linked-documents"), refetch });

    render(<WikiSearchCompanyDocuments query="leave" />);

    expect(screen.getByText("Company documents could not be searched")).toBeInTheDocument();
    expect(screen.getByText("req-8c")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("disappears quietly, without an error, when the server says the feature is off (404)", () => {
    mockList.mockReturnValue({ data: undefined, isError: true, error: new ApiError("Not found", 404, "NOT_FOUND", {}, "/kb/linked-documents"), refetch: jest.fn() });

    const { container } = render(<WikiSearchCompanyDocuments query="leave" />);

    expect(container).toBeEmptyDOMElement();
  });
});
