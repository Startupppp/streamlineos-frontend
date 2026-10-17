import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import type { DocumentVersionsView } from "@/hooks/api/hr/document-kb-link";
import { DocumentVersionsPanel } from "./document-versions-panel";

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: { success: (m: string) => mockToast.success(m), error: (m: string) => mockToast.error(m) } }));

const mockCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));

const mockVersions = jest.fn();
const mockUploadFile = jest.fn();
const mockUploadVersion = jest.fn();
const mockApprove = jest.fn();
jest.mock("@/hooks/api/hr/document-kb-link", () => ({
  useDocumentVersions: () => mockVersions(),
  useUploadDocumentVersion: () => ({ mutateAsync: mockUploadVersion, isPending: false }),
  useApproveDocumentVersion: () => ({ mutateAsync: mockApprove, isPending: false }),
}));
jest.mock("@/hooks/api/use-upload-file", () => ({ useUploadFile: () => ({ mutateAsync: mockUploadFile, isPending: false }) }));

function viewFixture(over: Partial<DocumentVersionsView> = {}): DocumentVersionsView {
  return {
    documentId: 7,
    currentVersion: 1,
    versions: [
      { version: 1, status: "approved", fileName: "coc-v1.pdf", fileSize: 2048, mimeType: "application/pdf", effectiveDate: null, approvedAt: "2026-01-01T00:00:00.000Z", isCurrent: true },
      { version: 2, status: "pending", fileName: "coc-v2.pdf", fileSize: 4096, mimeType: "application/pdf", effectiveDate: null, approvedAt: null, isCurrent: false },
    ],
    ...over,
  };
}

function renderPanel(data: DocumentVersionsView | undefined, extra: Record<string, unknown> = {}) {
  mockVersions.mockReturnValue({ data, isError: false, error: null, ...extra });
  render(<DocumentVersionsPanel documentId={7} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockImplementation((key) => key === "hr:documents:publish" || key === "hr:documents:manage");
  mockUploadFile.mockResolvedValue({ key: "org/hr-documents/abc.pdf", size: 999, mimeType: "application/pdf" });
  mockUploadVersion.mockResolvedValue(viewFixture());
  mockApprove.mockResolvedValue(viewFixture());
});

describe("DocumentVersionsPanel", () => {
  it("lists every version with its status and marks the current one", () => {
    renderPanel(viewFixture());

    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Waiting for approval")).toBeInTheDocument();
  });

  it("approves a waiting version only after the person confirms what it changes", async () => {
    renderPanel(viewFixture());

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(mockApprove).not.toHaveBeenCalled();
    expect(await screen.findByText(/becomes the current file for everyone/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve version" }));

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith({ documentId: 7, version: 2 }));
    expect(mockToast.success).toHaveBeenCalledWith("Version 2 is now the current version.");
  });

  it("offers no approval to someone without the permission to publish", () => {
    mockCan.mockImplementation((key) => key === "hr:documents:manage");
    renderPanel(viewFixture());

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload new version/i })).toBeInTheDocument();
  });

  it("offers no upload to someone who cannot manage documents", () => {
    mockCan.mockReturnValue(false);
    renderPanel(viewFixture());

    expect(screen.queryByRole("button", { name: /upload new version/i })).not.toBeInTheDocument();
  });

  it("uploads the chosen file to the HR documents folder, then records it as a waiting version", async () => {
    renderPanel(viewFixture());
    const file = new File(["x"], "coc-v3.pdf", { type: "application/pdf" });

    fireEvent.change(screen.getByLabelText("Choose a new version file"), { target: { files: [file] } });

    await waitFor(() => expect(mockUploadFile).toHaveBeenCalledWith({ file, folder: "hr-documents" }));
    await waitFor(() =>
      expect(mockUploadVersion).toHaveBeenCalledWith({ documentId: 7, fileUrl: "org/hr-documents/abc.pdf", fileName: "coc-v3.pdf", fileSize: 999, mimeType: "application/pdf" }),
    );
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("waiting for approval"));
  });

  it("shows the message and a copyable reference when recording the version is refused", async () => {
    mockUploadVersion.mockRejectedValue(new ApiError("The file must be one uploaded to this organisation's document storage.", 400, "INVALID_DOCUMENT_FILE", { correlationId: "req-b3" }, "/hr/documents/7/versions"));
    renderPanel(viewFixture());

    fireEvent.change(screen.getByLabelText("Choose a new version file"), { target: { files: [new File(["x"], "a.pdf")] } });

    expect(await screen.findByText("Not done")).toBeInTheDocument();
    expect(screen.getByText("req-b3")).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("shows why the versions could not load, with its reference", () => {
    renderPanel(undefined, { isError: true, error: new ApiError("Server error", 500, "INTERNAL", { correlationId: "req-2f" }, "/hr/documents/7/versions") });

    expect(screen.getByText("Could not load the versions")).toBeInTheDocument();
    expect(screen.getByText("req-2f")).toBeInTheDocument();
  });
});
