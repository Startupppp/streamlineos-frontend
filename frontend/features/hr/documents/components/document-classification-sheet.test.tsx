import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import type { Document } from "@/types/hr";
import type { DocumentClassificationView } from "@/hooks/api/hr/document-classification";
import { DocumentClassificationSheet } from "./document-classification-sheet";

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: { success: (m: string) => mockToast.success(m), error: (m: string) => mockToast.error(m) } }));

const mockCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));

const mockView = jest.fn();
const mockClassify = jest.fn();
const mockSetAudiences = jest.fn();
jest.mock("@/hooks/api/hr/document-classification", () => ({
  useDocumentClassification: () => mockView(),
  useClassifyDocument: () => ({ mutateAsync: mockClassify, isPending: false }),
  useSetDocumentAudiences: () => ({ mutateAsync: mockSetAudiences, isPending: false }),
}));

jest.mock("./document-kb-link-panel", () => ({ DocumentKbLinkPanel: () => <div data-testid="kb-link-panel" /> }));
jest.mock("./document-versions-panel", () => ({ DocumentVersionsPanel: () => <div data-testid="versions-panel" /> }));

jest.mock("@/hooks/api/org-hierarchy-units", () => ({
  useOrgDepartments: () => ({ data: { data: [{ id: "d1", name: "Finance" }, { id: "d2", name: "Legal" }] }, isPending: false }),
}));
jest.mock("@/hooks/api/org-hierarchy", () => ({
  useOrgLocations: () => ({ data: { data: [{ id: "l1", name: "Pune" }] }, isPending: false }),
}));

function docFixture(over: Partial<Document> = {}): Document {
  return {
    id: 7,
    orgId: "org",
    userId: null,
    departmentId: null,
    name: "Code of Conduct",
    description: null,
    type: "POLICY",
    category: null,
    hasFile: true,
    fileName: "coc.pdf",
    fileSize: 100,
    mimeType: "application/pdf",
    version: 1,
    parentDocumentId: null,
    isPublic: false,
    isActive: true,
    classification: "PERSONAL",
    effectiveDate: null,
    expiryDate: null,
    expiryReminderSent: false,
    tags: [],
    metadata: null,
    uploadedBy: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function viewFixture(over: Partial<DocumentClassificationView> = {}): DocumentClassificationView {
  return {
    documentId: 7,
    classification: "PERSONAL",
    effectiveDate: null,
    audiences: [],
    publishable: false,
    blockers: [{ code: "CLASSIFICATION_NOT_SHAREABLE", message: "Only a document classified as Internal or Restricted can be shared." }],
    ...over,
  };
}

function renderSheet(view: DocumentClassificationView | undefined, over: { document?: Document; onOpenChange?: jest.Mock } = {}) {
  mockView.mockReturnValue({ data: view, isError: false, error: null });
  const onOpenChange = over.onOpenChange ?? jest.fn();
  render(<DocumentClassificationSheet open onOpenChange={onOpenChange} document={over.document ?? docFixture()} />);
  return { onOpenChange };
}

const radio = (name: RegExp) => screen.getByRole("radio", { name });

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockImplementation((key) => key === "hr:documents:publish" || key === "hr:documents:manage");
  mockClassify.mockResolvedValue({ ...viewFixture({ classification: "INTERNAL", publishable: true, blockers: [] }), linksTakenDown: 0 });
  mockSetAudiences.mockResolvedValue({ ...viewFixture({ classification: "INTERNAL", publishable: true, blockers: [] }), linkAudiencesNarrowed: 0 });
});

describe("DocumentClassificationSheet", () => {
  it("shows a skeleton, not the form, until the classification has loaded", () => {
    renderSheet(undefined);

    expect(screen.queryByRole("radio", { name: /internal/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();
  });

  it("lets a publisher make a policy Internal for all employees, saving the classification then the audience", async () => {
    renderSheet(viewFixture());

    fireEvent.click(radio(/^internal/i));
    fireEvent.click(await screen.findByRole("radio", { name: /all employees/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(mockClassify).toHaveBeenCalledWith({ documentId: 7, classification: "INTERNAL", effectiveDate: null }));
    await waitFor(() =>
      expect(mockSetAudiences).toHaveBeenCalledWith({ documentId: 7, audiences: [{ kind: "ALL_EMPLOYEES", refId: null }] }),
    );
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("internal"));
  });

  it("stays open after a document is made shareable, so it can be added to the Knowledge Base next", async () => {
    const { onOpenChange } = renderSheet(viewFixture());

    fireEvent.click(radio(/^internal/i));
    fireEvent.click(await screen.findByRole("radio", { name: /all employees/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(mockSetAudiences).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByTestId("kb-link-panel")).toBeInTheDocument();
    expect(screen.getByTestId("versions-panel")).toBeInTheDocument();
  });

  it("closes after a document is classified as something that cannot be shared", async () => {
    mockClassify.mockResolvedValue({ ...viewFixture({ classification: "CONFIDENTIAL" }), linksTakenDown: 0 });
    const { onOpenChange } = renderSheet(viewFixture({ classification: "INTERNAL", publishable: true, blockers: [] }));

    fireEvent.click(radio(/^confidential/i));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("sends exactly the ticked departments and locations for a Restricted document", async () => {
    renderSheet(viewFixture());

    fireEvent.click(radio(/^restricted/i));
    fireEvent.click(await screen.findByRole("radio", { name: /selected departments or locations/i }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Legal" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Pune" }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(mockSetAudiences).toHaveBeenCalledWith({
        documentId: 7,
        audiences: [{ kind: "DEPARTMENT", refId: "d2" }, { kind: "LOCATION", refId: "l1" }],
      }),
    );
  });

  it("asks for at least one unit rather than saving a limited audience of nobody", async () => {
    renderSheet(viewFixture());

    fireEvent.click(radio(/^restricted/i));
    fireEvent.click(await screen.findByRole("radio", { name: /selected departments or locations/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText("Pick at least one department or location.")).toBeInTheDocument();
    expect(mockClassify).not.toHaveBeenCalled();
    expect(mockSetAudiences).not.toHaveBeenCalled();
  });

  it("does not let someone without the publish permission move a document into Internal or Restricted, but still lets them keep it out", () => {
    mockCan.mockImplementation((key) => key === "hr:documents:manage");
    renderSheet(viewFixture());

    expect(radio(/^internal/i)).toBeDisabled();
    expect(radio(/^restricted/i)).toBeDisabled();
    expect(screen.getAllByText(/needs the permission to publish documents/i).length).toBeGreaterThan(0);
    expect(radio(/^confidential/i)).toBeEnabled();
    expect(radio(/^personal/i)).toBeEnabled();
  });

  it("says why a payslip cannot be shared and offers no way to share it, even to a publisher", () => {
    renderSheet(
      viewFixture({
        blockers: [
          { code: "CLASSIFICATION_NOT_SHAREABLE", message: "Only a document classified as Internal or Restricted can be shared." },
          { code: "TYPE_NOT_ALLOWED", message: "Only a company policy or a general document can be shared; every other type describes a person." },
        ],
      }),
      { document: docFixture({ type: "PAYSLIP", name: "March payslip" }) },
    );

    expect(screen.getByText("This document cannot be shared")).toBeInTheDocument();
    expect(screen.getByText(/every other type describes a person/i)).toBeInTheDocument();
    expect(radio(/^internal/i)).toBeDisabled();
    expect(radio(/^restricted/i)).toBeDisabled();
    expect(radio(/^confidential/i)).toBeEnabled();
  });

  it("tells the person how many Knowledge Base entries their change took down, and sends no audience for a class that is not shared", async () => {
    mockClassify.mockResolvedValue({ ...viewFixture({ classification: "CONFIDENTIAL" }), linksTakenDown: 2 });
    renderSheet(
      viewFixture({
        classification: "INTERNAL",
        publishable: true,
        blockers: [],
        audiences: [{ id: 1, kind: "ALL_EMPLOYEES", refId: null, label: null }],
      }),
    );

    fireEvent.click(radio(/^confidential/i));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(mockClassify).toHaveBeenCalledWith(expect.objectContaining({ classification: "CONFIDENTIAL" })));
    expect(mockSetAudiences).not.toHaveBeenCalled();
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("2 Knowledge Base entries were taken down.")));
  });

  it("keeps the sheet open and shows the message and a copyable reference when the server refuses", async () => {
    mockClassify.mockRejectedValue(
      new ApiError("This document cannot be shared with the company.", 422, "DOCUMENT_NOT_PUBLISHABLE", { correlationId: "req-42ab" }, "/hr/documents/7/classification"),
    );
    const { onOpenChange } = renderSheet(viewFixture());

    fireEvent.click(radio(/^internal/i));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText("Not saved")).toBeInTheDocument();
    expect(screen.getByText("req-42ab")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("closes without calling the server when nothing was changed", async () => {
    const { onOpenChange } = renderSheet(viewFixture());

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mockClassify).not.toHaveBeenCalled();
    expect(mockSetAudiences).not.toHaveBeenCalled();
  });

  it("shows the load failure with its reference instead of an empty form", () => {
    mockView.mockReturnValue({
      data: undefined,
      isError: true,
      error: new ApiError("Server error", 500, "INTERNAL", { correlationId: "req-9d" }, "/hr/documents/7/classification"),
    });
    render(<DocumentClassificationSheet open onOpenChange={jest.fn()} document={docFixture()} />);

    expect(screen.getByText(/could not load the classification of this document/i)).toBeInTheDocument();
    expect(screen.getByText("req-9d")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /internal/i })).not.toBeInTheDocument();
  });
});
