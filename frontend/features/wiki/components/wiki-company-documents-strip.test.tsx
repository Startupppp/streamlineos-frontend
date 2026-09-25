import { render, screen } from "@testing-library/react";
import type { LinkedDocumentItem } from "@/hooks/api/kb/linked-documents";
import { WikiCompanyDocumentsStrip } from "./wiki-company-documents-strip";

const mockFlags = jest.fn();
jest.mock("@/hooks/api/kb/hr-link-config", () => ({ useHrKbLinkFlags: () => mockFlags() }));

const mockList = jest.fn();
jest.mock("@/hooks/api/kb/linked-documents", () => ({ useLinkedDocuments: (...args: unknown[]) => mockList(...args) }));

function item(over: Partial<LinkedDocumentItem> = {}): LinkedDocumentItem {
  return {
    id: 31,
    name: "Code of Conduct",
    description: null,
    category: null,
    tags: [],
    documentType: "POLICY",
    effectiveDate: null,
    version: 1,
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

beforeEach(() => {
  jest.clearAllMocks();
  mockFlags.mockReturnValue({ link: true, search: false, ai: false });
  mockList.mockReturnValue({ data: { data: [item()], pagination: { limit: 6, hasMore: false, nextCursor: null } } });
});

describe("WikiCompanyDocumentsStrip", () => {
  it("shows the newest company documents, each marked as an HR document and linking to its entry", () => {
    render(<WikiCompanyDocumentsStrip />);

    expect(screen.getByRole("heading", { name: "Company documents" })).toBeInTheDocument();
    expect(screen.getByText("Code of Conduct")).toBeInTheDocument();
    expect(screen.getByText("HR document")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /code of conduct/i })).toHaveAttribute("href", "/knowledge/wiki/company-documents/31");
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/knowledge/wiki/company-documents");
  });

  it("renders nothing, and does not even ask for the list, while the switch is off", () => {
    mockFlags.mockReturnValue({ link: false, search: false, ai: false });

    const { container } = render(<WikiCompanyDocumentsStrip />);

    expect(container).toBeEmptyDOMElement();
    expect(mockList).toHaveBeenCalledWith({ limit: 6 }, { enabled: false });
  });

  it("renders nothing when there is nothing to show, rather than an empty heading", () => {
    mockList.mockReturnValue({ data: { data: [], pagination: { limit: 6, hasMore: false, nextCursor: null } } });

    const { container } = render(<WikiCompanyDocumentsStrip />);

    expect(container).toBeEmptyDOMElement();
  });

  it("titles a document whose source was removed rather than showing a blank card", () => {
    mockList.mockReturnValue({ data: { data: [item({ name: null })], pagination: { limit: 6, hasMore: false, nextCursor: null } } });

    render(<WikiCompanyDocumentsStrip />);

    expect(screen.getByText("Removed document")).toBeInTheDocument();
  });
});
