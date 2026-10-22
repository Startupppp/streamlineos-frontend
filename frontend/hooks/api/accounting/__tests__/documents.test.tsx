import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { downloadExport } from "@/lib/download-export";
import { accountingDocumentsQueryKeys } from "@/lib/query-keys/accounting-documents";
import {
  useAttachDocumentFile,
  useDocumentCompliance,
  useDownloadDocumentPdf,
  useRemoveDocumentAttachment,
} from "@/hooks/api/accounting/documents";
import type { DocumentAttachmentPage } from "@/hooks/api/accounting/documents-schema";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({ data: undefined, refetch: jest.fn() }),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: object) => useMutation(options),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/lib/download-export", () => ({ downloadExport: jest.fn() }));
jest.mock("@/lib/read-file-as-base64", () => ({
  readFileAsBase64: jest.fn().mockResolvedValue("aGVsbG8="),
}));

const attachment = (id: string) => ({
  id,
  bookId: "book-1",
  documentType: "sales_invoice" as const,
  documentId: "inv-1",
  fileName: `${id}.pdf`,
  mimeType: "application/pdf",
  sizeBytes: 10,
  storageUrl: null,
  uploadedBy: null,
  createdAt: "2026-10-01T00:00:00.000Z",
});

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, wrapper };
}

const listKey = (page: number) =>
  accountingDocumentsQueryKeys.accountingDocuments.attachments("sales_invoice", "inv-1", {
    page,
    pageSize: 2,
  });

beforeEach(() => jest.clearAllMocks());

describe("useDownloadDocumentPdf", () => {
  it.each([
    ["invoice", "/accounting/ar/invoices/doc-1/pdf"],
    ["credit-note", "/accounting/ar/credit-notes/doc-1/pdf"],
    ["bill", "/accounting/payables/documents/doc-1/pdf"],
  ] as const)("downloads a %s from %s", async (kind, endpoint) => {
    (downloadExport as jest.Mock).mockResolvedValue({ filename: "x.pdf", bytes: 1 });
    const { wrapper } = setup();
    const { result } = renderHook(() => useDownloadDocumentPdf(kind), { wrapper });

    await result.current.mutateAsync({ documentId: "doc-1", fallbackName: "x.pdf" });

    expect((downloadExport as jest.Mock).mock.calls[0][0]).toBe(endpoint);
  });
});

describe("useDocumentCompliance", () => {
  it("reads a 404 (no decision recorded) as null, not an error", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(
      new ApiError("No compliance decision has been recorded for that document", 404),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useDocumentCompliance("sales_invoice", "inv-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("still fails on any other error", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new ApiError("boom", 500));
    const { wrapper } = setup();
    const { result } = renderHook(() => useDocumentCompliance("sales_invoice", "inv-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("attachment cache patches", () => {
  it("puts a new file at the head of page 1 and bumps every page's total", async () => {
    const { client, wrapper } = setup();
    const page1: DocumentAttachmentPage = {
      items: [attachment("a"), attachment("b")],
      page: 1,
      pageSize: 2,
      total: 3,
    };
    const page2: DocumentAttachmentPage = { items: [attachment("c")], page: 2, pageSize: 2, total: 3 };
    client.setQueryData(listKey(1), page1);
    client.setQueryData(listKey(2), page2);
    (apiClient.post as jest.Mock).mockResolvedValue(attachment("new"));

    const { result } = renderHook(() => useAttachDocumentFile("sales_invoice", "inv-1"), {
      wrapper,
    });
    await result.current.mutateAsync(new File(["hello"], "new.pdf", { type: "application/pdf" }));

    const patched1 = client.getQueryData<DocumentAttachmentPage>(listKey(1));
    const patched2 = client.getQueryData<DocumentAttachmentPage>(listKey(2));
    expect(patched1?.items.map((item) => item.id)).toEqual(["new", "a"]);
    expect(patched1?.total).toBe(4);
    expect(patched2?.items.map((item) => item.id)).toEqual(["c"]);
    expect(patched2?.total).toBe(4);
  });

  it("drops a removed file from the cached page", async () => {
    const { client, wrapper } = setup();
    client.setQueryData(listKey(1), {
      items: [attachment("a"), attachment("b")],
      page: 1,
      pageSize: 2,
      total: 2,
    });
    (apiClient.delete as jest.Mock).mockResolvedValue({ id: "a", deleted: true });

    const { result } = renderHook(() => useRemoveDocumentAttachment("sales_invoice", "inv-1"), {
      wrapper,
    });
    await result.current.mutateAsync("a");

    const patched = client.getQueryData<DocumentAttachmentPage>(listKey(1));
    expect(patched?.items.map((item) => item.id)).toEqual(["b"]);
    expect(patched?.total).toBe(1);
  });
});
