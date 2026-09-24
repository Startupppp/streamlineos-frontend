import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Document } from "@/types/hr";
import { DocumentRowActions } from "./document-row-actions";

const mockCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));
jest.mock("@/hooks/common/use-file-url", () => ({ downloadProtectedFile: jest.fn(), viewProtectedFile: jest.fn() }));
jest.mock("sonner", () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }));

const doc: Document = {
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
};

async function openMenu(onClassify?: jest.Mock) {
  render(<DocumentRowActions doc={doc} onDelete={jest.fn()} onEdit={jest.fn()} onSendForSignature={jest.fn()} onClassify={onClassify} />);
  await userEvent.click(screen.getByRole("button", { name: /more options/i }));
}

describe("DocumentRowActions — classification and sharing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockImplementation((key) => key === "hr:documents:manage");
  });

  it("offers the item to someone who manages documents when the feature is on, and hands over the document", async () => {
    const onClassify = jest.fn();
    await openMenu(onClassify);

    await userEvent.click(screen.getByRole("menuitem", { name: /classification and sharing/i }));

    expect(onClassify).toHaveBeenCalledWith(doc);
  });

  it("does not offer it when the feature is off, even to someone who manages documents", async () => {
    await openMenu(undefined);

    expect(screen.getByRole("menuitem", { name: /edit details/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /classification and sharing/i })).not.toBeInTheDocument();
  });

  it("does not offer it to someone who cannot manage documents, even when the feature is on", async () => {
    mockCan.mockReturnValue(false);
    await openMenu(jest.fn());

    expect(screen.getByRole("menuitem", { name: /view file/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /classification and sharing/i })).not.toBeInTheDocument();
  });
});
