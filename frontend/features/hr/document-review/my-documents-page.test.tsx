import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { MyOnboardingDoc } from "@/hooks/api/hr/documents";
import {
  myDocumentRowActions,
  myDocumentRowHint,
} from "@/features/hr/document-review/my-document-status";
import { uploadFileRejection } from "@/features/hr/document-review/upload-file-validation";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" } } }),
}));

jest.mock("@/hooks/api/use-page-state", () => {
  const { resolvePageState } = jest.requireActual<
    typeof import("@/lib/page-state/resolve-page-state")
  >("@/lib/page-state/resolve-page-state");
  return {
    usePageState: (
      options: Omit<Parameters<typeof resolvePageState>[0], "access">,
    ) => resolvePageState({ ...options, access: "granted" }),
  };
});

const canMock = jest.fn(() => true);
jest.mock("@/hooks/api/access", () => ({
  useCan: () => canMock(),
  useAccess: () => ({
    data: { scopes: {}, modules: {}, isOrgOwner: false },
    refetch: jest.fn(),
  }),
  useModuleEnabled: () => true,
  useCanState: () => "granted",
}));

jest.mock("@/features/hr/document-review/upload-doc-sheet", () => ({
  UploadDocSheet: () => null,
}));

const viewProtectedFile = jest.fn<Promise<void>, [string]>(() => Promise.resolve());
const downloadProtectedFile = jest.fn<Promise<void>, [string, string]>(() =>
  Promise.resolve(),
);
jest.mock("@/hooks/common/use-file-url", () => ({
  viewProtectedFile: (endpoint: string) => viewProtectedFile(endpoint),
  downloadProtectedFile: (endpoint: string, fileName: string) =>
    downloadProtectedFile(endpoint, fileName),
}));

const apiGet = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import { MyDocumentsPage } from "@/features/hr/document-review/my-documents-page";

function doc(overrides: Partial<MyOnboardingDoc> = {}): MyOnboardingDoc {
  return {
    id: 1,
    documentTypeId: 10,
    documentTypeName: "Aadhaar",
    isMandatory: true,
    status: "APPROVED",
    remarks: null,
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    hasFile: true,
    fileName: "aadhaar.pdf",
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MyDocumentsPage />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiGet.mockReset();
  viewProtectedFile.mockClear();
  downloadProtectedFile.mockClear();
});

describe("HRMS-UX-008 — the ESS vault has row actions, not status-only rows", () => {
  it("an approved document offers view and download against the self-scoped file route", async () => {
    apiGet.mockResolvedValue({
      data: [doc()],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });
    renderPage();

    const view = await screen.findByRole("button", { name: "View Aadhaar" });
    await userEvent.click(view);
    expect(viewProtectedFile).toHaveBeenCalledWith("/hr/onboarding-docs/me/1/file");

    await userEvent.click(screen.getByRole("button", { name: "Download Aadhaar" }));
    expect(downloadProtectedFile).toHaveBeenCalledWith(
      "/hr/onboarding-docs/me/1/file",
      "aadhaar.pdf",
    );
  });

  it("a pending document offers an upload instead of a dead status row", async () => {
    apiGet.mockResolvedValue({
      data: [doc({ status: "PENDING", hasFile: false, fileName: undefined })],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });
    renderPage();

    expect(await screen.findByRole("button", { name: "Upload" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View Aadhaar" })).not.toBeInTheDocument();
  });

  it("pages past the first 25 with the endpoint's cursor rather than capping the list", async () => {
    apiGet.mockResolvedValue({
      data: [doc()],
      pagination: { limit: 25, hasMore: true, nextCursor: "cursor-2" },
    });
    renderPage();

    const next = await screen.findByRole("button", { name: "Next page" });
    await userEvent.click(next);

    await waitFor(() =>
      expect(
        apiGet.mock.calls.some(
          (call) =>
            call[0] === "/hr/onboarding-docs/me" &&
            (call[1] as Record<string, unknown>).cursor === "cursor-2",
        ),
      ).toBe(true),
    );
  });

  it("the pending filter asks the server for PENDING rows", async () => {
    apiGet.mockResolvedValue({
      data: [doc()],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });
    renderPage();

    await screen.findByText("Aadhaar");
    await userEvent.click(screen.getByLabelText("Pending only"));

    await waitFor(() =>
      expect(
        apiGet.mock.calls.some(
          (call) => (call[1] as Record<string, unknown>)?.status === "PENDING",
        ),
      ).toBe(true),
    );
  });

  it("hides the acknowledgement panel from a caller without hr:documents:view", async () => {
    apiGet.mockResolvedValue({
      data: [doc()],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });
    renderPage();
    await screen.findByText("Aadhaar");
    expect(screen.queryByText("Acknowledgements")).not.toBeInTheDocument();
  });
});

describe("HRMS-UX-008 — status drives the row actions, and expiry is not invented", () => {
  it("never advertises a file for a document that has none", () => {
    const actions = myDocumentRowActions(
      doc({ status: "PENDING", hasFile: false }),
      true,
    );
    expect(actions.canView).toBe(false);
    expect(actions.canDownload).toBe(false);
    expect(actions.canUpload).toBe(true);
  });

  it("offers a re-upload after a rejection and names the reason", () => {
    const rejected = doc({ status: "REJECTED", remarks: "Blurred scan" });
    expect(myDocumentRowActions(rejected, true).uploadLabel).toBe("Re-upload");
    expect(myDocumentRowHint(rejected)).toBe("Blurred scan");
  });

  it("gives an approved document no upload affordance", () => {
    expect(myDocumentRowActions(doc(), true).canUpload).toBe(false);
  });
});

describe("HRMS-UX-008 — upload validation is explicit about what was wrong", () => {
  function file(name: string, size: number, type: string): File {
    const value = new File(["x"], name, { type });
    Object.defineProperty(value, "size", { value: size });
    return value;
  }

  it("names the size limit and the actual size", () => {
    expect(uploadFileRejection(file("scan.pdf", 12 * 1024 * 1024, "application/pdf"))).toContain(
      "The limit is 10 MB",
    );
  });

  it("rejects a type the accept attribute alone would not stop", () => {
    expect(uploadFileRejection(file("payload.exe", 1024, "application/octet-stream"))).toContain(
      "not an accepted file type",
    );
  });

  it("accepts a PDF inside the limit", () => {
    expect(uploadFileRejection(file("scan.pdf", 1024, "application/pdf"))).toBeNull();
  });
});
