import { render, screen } from "@testing-library/react";
import type { Document } from "@/types/hr";
import { createDocumentColumns } from "./document-columns";

jest.mock("./document-row-actions", () => ({ DocumentRowActions: () => null }));

const doc: Document = {
  id: 1,
  orgId: "org",
  userId: null,
  departmentId: null,
  name: "Handbook",
  description: null,
  type: "POLICY",
  category: null,
  hasFile: true,
  fileName: "handbook.pdf",
  fileSize: 10,
  mimeType: "application/pdf",
  version: 1,
  parentDocumentId: null,
  isPublic: false,
  isActive: true,
  classification: "RESTRICTED",
  effectiveDate: null,
  expiryDate: null,
  expiryReminderSent: false,
  tags: [],
  metadata: null,
  uploadedBy: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const noop = jest.fn();

describe("document columns — Sharing", () => {
  it("adds a Sharing column showing the classification when the feature is on", () => {
    const columns = createDocumentColumns(noop, noop, noop, noop);
    const sharing = columns.find((column) => column.key === "classification");

    expect(sharing?.header).toBe("Sharing");
    render(<>{sharing?.cell(doc)}</>);
    expect(screen.getByText("Restricted")).toBeInTheDocument();
  });

  it("leaves the table exactly as it was when the feature is off", () => {
    const columns = createDocumentColumns(noop, noop, noop);

    expect(columns.map((column) => column.key)).toEqual(["name", "type", "date", "size", "actions"]);
  });
});
