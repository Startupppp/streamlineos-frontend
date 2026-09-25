import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import type { Document } from "@/types/hr";
import { DocumentTable } from "./document-table";

/**
 * HRMS-E2E-009, the bulk-download half. "Download all as ZIP" fetched each file
 * and packed whatever came back, so a zero-byte body went into the archive as
 * an empty file and the toast still said every file was packaged. When every
 * fetch failed it saved an empty ZIP anyway.
 */

jest.mock("./document-columns", () => ({ createDocumentColumns: () => [] }));
jest.mock("@/hooks/common/use-file-url", () => ({
  getProtectedFileUrl: (path: string) => Promise.resolve(`https://files.test${path}`),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

const zipFile = jest.fn();
const generateAsync = jest.fn().mockResolvedValue(new Blob(["zip"]));
jest.mock("jszip", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ file: zipFile, generateAsync })),
}));

function doc(id: number, fileName: string): Document {
  return {
    id,
    orgId: "org",
    userId: null,
    departmentId: null,
    name: fileName,
    description: null,
    type: "POLICY",
    category: null,
    hasFile: true,
    fileName,
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
}

const noop = jest.fn();
const documents = [doc(1, "a.pdf"), doc(2, "b.pdf")];

function renderTable() {
  render(
    <DocumentTable
      documents={documents}
      folders={[]}
      page={2}
      hasNext={false}
      isFetching={false}
      selectedCategory="All Files"
      searchTerm=""
      canManageDocs
      onPreviousPage={noop}
      onNextPage={noop}
      onDelete={jest.fn().mockResolvedValue(undefined)}
      onEdit={noop}
      onOpenUpload={noop}
      onSendForSignature={noop}
    />,
  );
}

/** Files served by URL suffix: `ok` has bytes, `empty` has none. */
function serve(bodies: Record<number, "ok" | "empty">) {
  // jsdom has neither `fetch` nor `Response`; the component reads only `ok` and `blob()`.
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    writable: true,
    value: jest.fn(async (input: string) => {
      const id = Number(/documents\/(\d+)\/file/.exec(input)?.[1]);
      const blob = new Blob(bodies[id] === "ok" ? ["%PDF-1.7"] : []);
      return { ok: true, blob: async () => blob };
    }),
  });
}

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => "blob:zip");
  URL.revokeObjectURL = jest.fn();
});
beforeEach(() => jest.clearAllMocks());

async function clickZip() {
  renderTable();
  fireEvent.click(screen.getByRole("button", { name: /zip/i }));
  await waitFor(() =>
    expect(
      (toast.success as jest.Mock).mock.calls.length +
        (toast.warning as jest.Mock).mock.calls.length +
        (toast.error as jest.Mock).mock.calls.length,
    ).toBe(1),
  );
}

describe("DocumentTable ZIP download", () => {
  it("packages every file and says so when every file has bytes", async () => {
    serve({ 1: "ok", 2: "ok" });
    await clickZip();

    expect(zipFile.mock.calls.map((call) => call[0])).toEqual(["a.pdf", "b.pdf"]);
    expect((toast.success as jest.Mock).mock.calls[0]?.[0]).toBe("2 file(s) packaged into ZIP");
  });

  it("leaves a zero-byte file out of the archive and counts it as failed", async () => {
    serve({ 1: "ok", 2: "empty" });
    await clickZip();

    expect(zipFile.mock.calls.map((call) => call[0])).toEqual(["a.pdf"]);
    expect((toast.warning as jest.Mock).mock.calls[0]?.[0]).toBe("1 downloaded; 1 failed.");
  });

  it("saves no archive at all when every file failed", async () => {
    serve({ 1: "empty", 2: "empty" });
    await clickZip();

    expect(generateAsync.mock.calls.length).toBe(0);
    expect((toast.error as jest.Mock).mock.calls[0]?.[0]).toMatch(/none of the 2 files/i);
  });
});
