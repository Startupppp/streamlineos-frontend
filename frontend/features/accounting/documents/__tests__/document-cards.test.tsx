import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import {
  useDocumentAttachments,
  useDocumentCompliance,
} from "@/hooks/api/accounting/documents";
import { DocumentAttachmentsCard } from "../document-attachments-card";
import { DocumentComplianceCard } from "../document-compliance-card";

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useCanState: jest.fn().mockReturnValue("granted"),
}));

const attachMutate = jest.fn();
const idleMutation = () => ({ mutate: jest.fn(), isPending: false, variables: undefined });

jest.mock("@/hooks/api/accounting/documents", () => ({
  ...jest.requireActual("@/hooks/api/accounting/documents"),
  useDocumentAttachments: jest.fn(),
  useAttachDocumentFile: () => ({ mutate: attachMutate, isPending: false }),
  useRemoveDocumentAttachment: () => idleMutation(),
  useDownloadDocumentAttachment: () => idleMutation(),
  useDocumentCompliance: jest.fn(),
  useSubmitDocumentCompliance: () => idleMutation(),
}));

const mockedCan = useCan as jest.Mock;

const attachment = {
  id: "att-1",
  bookId: "book-1",
  documentType: "sales_invoice" as const,
  documentId: "inv-1",
  fileName: "receipt.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2048,
  storageUrl: null,
  uploadedBy: null,
  createdAt: "2026-10-01T00:00:00.000Z",
};

function pickFile(file: File): void {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  jest.clearAllMocks();
  (useDocumentAttachments as jest.Mock).mockReturnValue({
    data: { items: [attachment], page: 1, pageSize: 10, total: 1 },
    isError: false,
    refetch: jest.fn(),
  });
});

describe("DocumentAttachmentsCard", () => {
  it("offers attach and remove to a manager", () => {
    mockedCan.mockReturnValue(true);
    render(<DocumentAttachmentsCard documentType="sales_invoice" documentId="inv-1" />);

    expect(screen.getByText("receipt.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attach file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove receipt.pdf" })).toBeInTheDocument();
  });

  it("lists and downloads, but never offers attach or remove, to a reader", () => {
    mockedCan.mockReturnValue(false);
    render(<DocumentAttachmentsCard documentType="sales_invoice" documentId="inv-1" />);

    expect(screen.getByRole("button", { name: "Download receipt.pdf" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Attach file" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove receipt.pdf" })).toBeNull();
  });

  it("refuses a file type the backend would reject, without uploading", () => {
    mockedCan.mockReturnValue(true);
    render(<DocumentAttachmentsCard documentType="sales_invoice" documentId="inv-1" />);

    pickFile(new File(["x"], "run.exe", { type: "application/x-msdownload" }));

    expect(attachMutate).not.toHaveBeenCalled();
    expect((toast.error as jest.Mock).mock.calls[0][0]).toMatch(/not an accepted type/);
  });

  it("refuses a file over 2 MB, without uploading", () => {
    mockedCan.mockReturnValue(true);
    render(<DocumentAttachmentsCard documentType="sales_invoice" documentId="inv-1" />);

    pickFile(new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.pdf", { type: "application/pdf" }));

    expect(attachMutate).not.toHaveBeenCalled();
    expect((toast.error as jest.Mock).mock.calls[0][0]).toMatch(/larger than 2 MB/);
  });

  it("uploads an accepted file", () => {
    mockedCan.mockReturnValue(true);
    render(<DocumentAttachmentsCard documentType="sales_invoice" documentId="inv-1" />);

    pickFile(new File(["%PDF"], "ok.pdf", { type: "application/pdf" }));

    expect(attachMutate).toHaveBeenCalledTimes(1);
  });
});

function compliance(overrides: { configured: boolean; status: "pending" | "accepted" }) {
  return {
    states: [
      {
        headline: "An IRN is owed and has not been requested.",
        filed: overrides.status === "accepted",
        action: null,
        transport: "irp",
        status: overrides.status,
        authorityId: null,
        ackNo: null,
        ackAt: null,
        errors: null,
        cancelledAt: null,
      },
    ],
    filed: overrides.status === "accepted",
    headline: "An IRN is owed and has not been requested.",
    transport: { configured: overrides.configured, real: true, name: "IRP" },
  };
}

describe("DocumentComplianceCard", () => {
  it("offers submit for an unfiled document when a transport is configured", () => {
    mockedCan.mockReturnValue(true);
    (useDocumentCompliance as jest.Mock).mockReturnValue({
      data: compliance({ configured: true, status: "pending" }),
      isError: false,
      refetch: jest.fn(),
    });
    render(<DocumentComplianceCard documentType="sales_invoice" documentId="inv-1" />);

    expect(screen.getByRole("button", { name: "Submit to IRP" })).toBeInTheDocument();
  });

  it.each([
    ["no transport is configured", { configured: false, status: "pending" as const }, true],
    ["the document is already accepted", { configured: true, status: "accepted" as const }, true],
    ["the viewer cannot manage receivables", { configured: true, status: "pending" as const }, false],
  ])("hides submit when %s", (_label, state, canManage) => {
    mockedCan.mockReturnValue(canManage);
    (useDocumentCompliance as jest.Mock).mockReturnValue({
      data: compliance(state),
      isError: false,
      refetch: jest.fn(),
    });
    render(<DocumentComplianceCard documentType="sales_invoice" documentId="inv-1" />);

    expect(screen.queryByRole("button", { name: /Submit to/ })).toBeNull();
    expect(screen.getAllByText("An IRN is owed and has not been requested.").length).toBeGreaterThan(0);
  });

  it("renders nothing when no decision was recorded", () => {
    mockedCan.mockReturnValue(true);
    (useDocumentCompliance as jest.Mock).mockReturnValue({ data: null, isError: false, refetch: jest.fn() });
    const { container } = render(
      <DocumentComplianceCard documentType="sales_invoice" documentId="inv-1" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
