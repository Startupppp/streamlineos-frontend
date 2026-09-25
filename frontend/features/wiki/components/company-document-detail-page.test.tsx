import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import type { LinkedDocumentDetail } from "@/hooks/api/kb/linked-documents";
import CompanyDocumentDetailPage from "./company-document-detail-page";

const mockToast = { error: jest.fn() };
jest.mock("sonner", () => ({ toast: { error: (m: string) => mockToast.error(m) } }));

// usePageState and PageState are the real ones: a test that stubs them decides the outcome the page is supposed to reach.
const mockCan = jest.fn<boolean, [string]>();
const mockAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key), useAccess: () => mockAccess() }));
jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));

const mockConfig = jest.fn();
jest.mock("@/hooks/api/kb/hr-link-config", () => ({ useHrKbLinkConfig: () => mockConfig() }));

const mockDetail = jest.fn();
const mockOpen = jest.fn();
const mockForgetOpen = jest.fn();
jest.mock("@/hooks/api/kb/linked-documents", () => ({
  useLinkedDocument: (...args: unknown[]) => mockDetail(...args),
  useOpenLinkedDocument: () => ({ mutateAsync: mockOpen, reset: mockForgetOpen, isPending: false }),
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

function notFoundError() {
  return new ApiError("Not found", 404, "NOT_FOUND", {}, "/kb/linked-documents/31");
}

const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockReturnValue(false);
  mockAccess.mockReturnValue({ data: { isOrgOwner: true, scopes: {}, modules: {} }, isLoading: false });
  mockOpen.mockResolvedValue({ url: "https://files.example/signed", fileName: "coc.pdf", expiresIn: 300 });
  linkSwitch(true);
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
    expect(mockDetail).toHaveBeenCalledWith(31, { enabled: true });
  });

  it("asks the server for a signed link when the reader opens the file, and opens it without a referrer", async () => {
    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    await userEvent.click(screen.getByRole("button", { name: "Open file" }));

    await waitFor(() => expect(mockOpen).toHaveBeenCalledWith(31));
    expect(openSpy).toHaveBeenCalledWith("https://files.example/signed", "_blank", "noopener,noreferrer");
    // The single-use URL is not left in the mutation's result once the browser has it.
    expect(mockForgetOpen).toHaveBeenCalledTimes(1);
  });

  it("shows the server's message and opens nothing when the entry can no longer be opened", async () => {
    const failure = new ApiError("Not found", 404, "NOT_FOUND", {}, "/kb/linked-documents/31/open");
    mockOpen.mockRejectedValue(failure);

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);
    await userEvent.click(screen.getByRole("button", { name: "Open file" }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(getErrorMessage(failure)));
    expect(openSpy).not.toHaveBeenCalled();
    expect(mockForgetOpen).not.toHaveBeenCalled();
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
    loaded(undefined, { isError: true, error: notFoundError() });

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText("Document not found")).toBeInTheDocument();
    expect(screen.getByText(/may have been withdrawn, or you may not have access/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to company documents" })).toHaveAttribute("href", "/knowledge/wiki/company-documents");
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("does not call an entry that is not there a removed document", () => {
    loaded(undefined, { isError: true, error: notFoundError() });

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByRole("heading", { level: 1, name: "Company document" })).toBeInTheDocument();
    expect(screen.queryByText("Removed document")).not.toBeInTheDocument();
    expect(screen.queryByText("Details no longer shown")).not.toBeInTheDocument();
  });

  it("stops showing an entry that a refresh has since found gone, rather than keeping its title and file", () => {
    loaded(detail(), { isError: true, error: notFoundError() });

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText("Document not found")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Code of Conduct" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open file" })).not.toBeInTheDocument();
  });

  it("still reports any other failure as an error, with a way to try again, and not as a missing document", async () => {
    const refetch = jest.fn();
    loaded(undefined, { isError: true, error: new ApiError("Boom", 500, "INTERNAL", {}, "/kb/linked-documents/31"), refetch });

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Document not found")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not name the page after a removed document while the entry is still loading", () => {
    loaded(undefined, { isLoading: true });

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByRole("heading", { level: 1, name: "Company document" })).toBeInTheDocument();
    expect(screen.queryByText("Removed document")).not.toBeInTheDocument();
    expect(screen.queryByText("Document not found")).not.toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("keeps the neutral heading when the reader may not view the knowledge base", () => {
    mockAccess.mockReturnValue({ data: { isOrgOwner: false, scopes: {}, modules: {} }, isLoading: false });
    loaded(undefined);

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByRole("heading", { level: 1, name: "Company document" })).toBeInTheDocument();
    expect(screen.queryByText("Removed document")).not.toBeInTheDocument();
    expect(screen.queryByText("Document not found")).not.toBeInTheDocument();
  });

  it("says the document is not available, and does not ask for it, while company documents are switched off", () => {
    linkSwitch(false);
    loaded(undefined);

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText("Document not found")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(mockDetail).toHaveBeenCalledWith(31, { enabled: false });
    expect(mockDetail).not.toHaveBeenCalledWith(31, { enabled: true });
  });

  it("does not show a document it still holds from before the switch was turned off", () => {
    linkSwitch(false);
    loaded(detail());

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText("Document not found")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Code of Conduct" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open file" })).not.toBeInTheDocument();
  });

  it("waits for the switch before deciding anything, and does not ask for the document until it is on", () => {
    linkSwitch(undefined, { isLoading: true });
    loaded(undefined);

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByRole("heading", { level: 1, name: "Company document" })).toBeInTheDocument();
    expect(screen.queryByText("Document not found")).not.toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(mockDetail).toHaveBeenCalledWith(31, { enabled: false });
  });

  it("reports an error, and retries the switch rather than the document, when the switch cannot be read", async () => {
    const refetchSwitch = jest.fn();
    const refetchDocument = jest.fn();
    linkSwitch(undefined, { isError: true, error: new ApiError("Down", 500, "INTERNAL", {}, "/kb/hr-link/config"), refetch: refetchSwitch });
    loaded(undefined, { refetch: refetchDocument });

    render(<CompanyDocumentDetailPage linkedDocumentId={31} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Document not found")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetchSwitch).toHaveBeenCalledTimes(1);
    expect(refetchDocument).not.toHaveBeenCalled();
  });
});
