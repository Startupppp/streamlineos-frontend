import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import type { LinkedDocumentDetail } from "@/hooks/api/kb/linked-documents";
import CompanyDocumentDetailPage from "./company-document-detail-page";

const mockToast = { error: jest.fn() };
jest.mock("sonner", () => ({ toast: { error: (m: string) => mockToast.error(m) } }));

const mockCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));

const mockDetail = jest.fn();
const mockOpen = jest.fn();
jest.mock("@/hooks/api/kb/linked-documents", () => ({
  useLinkedDocument: () => mockDetail(),
  useOpenLinkedDocument: () => ({ mutateAsync: mockOpen, isPending: false }),
}));

const mockPageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: (...args: unknown[]) => mockPageState(...args) }));
jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, empty, children }: { resolution: { kind: string }; loading: React.ReactNode; empty?: React.ReactNode; children: React.ReactNode }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "empty") return <>{empty ?? children}</>;
    return <>{children}</>;
  },
}));

function detail(over: Partial<LinkedDocumentDetail> = {}): LinkedDocumentDetail {
  return {
    id: 31,
    name: "Code of Conduct",
    description: "How we work together.",
    category: "Policies",
    tags: ["ethics"],
    documentType: "POLICY",
    effectiveDate: "2026-04-01",
    version: 3,
    publishedAt: "2026-09-01T00:00:00.000Z",
    source: "HR_DOCUMENT",
    hasFile: true,
    fileName: "coc.pdf",
    fileSize: 2048,
    mimeType: "application/pdf",
    status: "active",
    versionMode: "FOLLOW_LATEST",
    pinnedVersion: null,
    audiences: null,
    newerVersionAvailable: null,
    unpublishReason: null,
    ...over,
  };
}

function loaded(data: LinkedDocumentDetail | undefined, over: Record<string, unknown> = {}) {
  mockDetail.mockReturnValue({ data, isLoading: false, isError: false, error: null, refetch: jest.fn(), ...over });
}

const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockReturnValue(false);
  mockPageState.mockReturnValue({ kind: "ready" });
  mockOpen.mockResolvedValue({ url: "https://files.example/signed", fileName: "coc.pdf", expiresIn: 300 });
  loaded(detail());
});

describe("CompanyDocumentDetailPage", () => {
  it("shows the document as an HR document, with its facts and no publisher detail for a reader", () => {
    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByRole("heading", { name: "Code of Conduct" })).toBeInTheDocument();
    expect(screen.getByText("HR document")).toBeInTheDocument();
    expect(screen.getByText("How we work together.")).toBeInTheDocument();
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(screen.getByText("ethics")).toBeInTheDocument();
    expect(screen.queryByText("Who can see it")).not.toBeInTheDocument();
  });

  it("asks the server for a signed link when the reader opens the file, and opens it without a referrer", async () => {
    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    await userEvent.click(screen.getByRole("button", { name: "Open file" }));

    await waitFor(() => expect(mockOpen).toHaveBeenCalledWith(31));
    expect(openSpy).toHaveBeenCalledWith("https://files.example/signed", "_blank", "noopener,noreferrer");
  });

  it("shows the server's message and opens nothing when the entry can no longer be opened", async () => {
    mockOpen.mockRejectedValue(new ApiError("Not found", 404, "NOT_FOUND", {}, "/kb/linked-documents/31/open"));

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);
    await userEvent.click(screen.getByRole("button", { name: "Open file" }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("offers no file to open for an entry that links out to an external address", () => {
    loaded(detail({ hasFile: false }));

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.queryByRole("button", { name: "Open file" })).not.toBeInTheDocument();
    expect(screen.getByText("No file to open")).toBeInTheDocument();
  });

  it("shows a publisher who can see it, and says when a pinned entry has a newer version", () => {
    mockCan.mockReturnValue(true);
    loaded(
      detail({
        versionMode: "PINNED",
        pinnedVersion: 2,
        newerVersionAvailable: true,
        audiences: [{ kind: "DEPARTMENT", refId: "d1", label: "Finance" }, { kind: "ALL_EMPLOYEES", refId: null, label: null }],
      }),
    );

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText("Who can see it")).toBeInTheDocument();
    expect(screen.getByText("Finance, All employees")).toBeInTheDocument();
    expect(screen.getByText("Pinned to v2")).toBeInTheDocument();
    expect(screen.getByText("A newer version is available")).toBeInTheDocument();
  });

  it("tells a publisher a withdrawn entry cannot be opened and why, and offers no file", () => {
    mockCan.mockReturnValue(true);
    loaded(detail({ status: "unpublished", unpublishReason: "source_no_longer_publishable" }));

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText(/stopped being shareable/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open file" })).not.toBeInTheDocument();
  });

  it("titles an entry whose source was removed instead of leaving the heading blank", () => {
    mockCan.mockReturnValue(true);
    loaded(detail({ name: null, description: null, category: null, tags: [], status: "source_removed", hasFile: false }));

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByRole("heading", { name: "Removed document" })).toBeInTheDocument();
    expect(screen.getAllByText("Source removed")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Open file" })).not.toBeInTheDocument();
  });

  it("tells a publisher why an entry was withdrawn, in the words of the person who withdrew it", () => {
    mockCan.mockReturnValue(true);
    loaded(detail({ status: "unpublished", unpublishReason: "Replaced by the 2026 handbook.", audiences: [] }));

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText("This entry was withdrawn, and employees can no longer see it. Reason given: Replaced by the 2026 handbook.")).toBeInTheDocument();
  });

  it("puts the reason last, so a reason with no full stop still reads as a sentence", () => {
    mockCan.mockReturnValue(true);
    loaded(detail({ status: "unpublished", unpublishReason: "Replaced by the 2026 handbook", audiences: [] }));

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText("This entry was withdrawn, and employees can no longer see it. Reason given: Replaced by the 2026 handbook")).toBeInTheDocument();
  });

  it("does not present the server's own codes as a reason", () => {
    mockCan.mockReturnValue(true);
    loaded(detail({ status: "unpublished", unpublishReason: "manual", audiences: [] }));
    const { unmount } = render(<CompanyDocumentDetailPage linkedDocumentId={31} />);
    expect(screen.getByText("This entry was withdrawn. Employees can no longer see it.")).toBeInTheDocument();
    expect(screen.queryByText(/Reason given/)).not.toBeInTheDocument();
    unmount();

    loaded(detail({ status: "unpublished", unpublishReason: null, audiences: [] }));
    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);
    expect(screen.getByText("This entry was withdrawn. Employees can no longer see it.")).toBeInTheDocument();
  });

  it("keeps the reason out of the page for someone who cannot publish", () => {
    mockCan.mockReturnValue(false);
    loaded(detail({ status: "unpublished", unpublishReason: "Contains an outdated salary table" }));

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.queryByText(/outdated salary table/)).not.toBeInTheDocument();
  });

  it("explains why a withdrawn entry shows no details, rather than showing a blank page", () => {
    mockCan.mockReturnValue(true);
    loaded(detail({ name: null, description: null, category: null, tags: [], documentType: null, effectiveDate: null, version: null, fileName: null, fileSize: null, mimeType: null, hasFile: false, status: "unpublished" }));

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByRole("heading", { name: "Details no longer shown" })).toBeInTheDocument();
    expect(screen.getByText("The details are hidden")).toBeInTheDocument();
    expect(screen.getByText(/can no longer be shared with the company/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open file" })).not.toBeInTheDocument();
  });

  it("does not add that explanation to a removed entry, or to a withdrawn one that still has its details", () => {
    mockCan.mockReturnValue(true);
    loaded(detail({ name: null, description: null, category: null, tags: [], status: "source_removed", hasFile: false }));
    const { unmount } = render(<CompanyDocumentDetailPage linkedDocumentId={31} />);
    expect(screen.queryByText("The details are hidden")).not.toBeInTheDocument();
    unmount();

    loaded(detail({ status: "unpublished" }));
    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);
    expect(screen.queryByText("The details are hidden")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Code of Conduct" })).toBeInTheDocument();
  });

  it("says it was not found, without saying whether it exists, when the server answers 404", () => {
    loaded(undefined, { isError: true, error: new ApiError("Not found", 404, "NOT_FOUND", {}, "/kb/linked-documents/31") });
    mockPageState.mockReturnValue({ kind: "empty" });

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText("Document not found")).toBeInTheDocument();
    expect(screen.getByText(/may have been withdrawn, or you may not have access/i)).toBeInTheDocument();
  });
});
