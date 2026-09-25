import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DataScope } from "@/hooks/api/access-schema";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { documentListContract } from "@/hooks/api/hr/documents-schema";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
}));

// Page state keeps its real branch order; access is granted as useCan is below.
jest.mock("@/hooks/api/use-page-state", () => {
  const { resolvePageState } = jest.requireActual<typeof import("@/lib/page-state/resolve-page-state")>(
    "@/lib/page-state/resolve-page-state",
  );
  return {
    usePageState: (options: Omit<Parameters<typeof resolvePageState>[0], "access">) =>
      resolvePageState({ ...options, access: "granted" }),
  };
});

const mockScope = jest.fn<DataScope, [string]>();
jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn(() => true),
  useScope: (key: string) => mockScope(key),
  useModuleEnabled: jest.fn(() => true),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockHrKbLinkFlags = jest.fn<{ link: boolean; search: boolean; ai: boolean }, []>();
jest.mock("@/hooks/api/kb/hr-link-config", () => ({
  useHrKbLinkFlags: () => mockHrKbLinkFlags(),
  useHrKbLinkFlagsAdmin: () => ({ data: undefined }),
  useUpdateHrKbLinkFlags: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

jest.mock("@/components/sign/create-envelope-dialog", () => ({
  CreateEnvelopeDialog: () => null,
}));

jest.mock(
  "@/features/hr/documents/components/upload-document-dialog",
  () => ({ UploadDocumentDialog: () => null }),
);

jest.mock("@/features/hr/documents/letter-generation-sheet", () => ({
  LetterGenerationSheet: () => null,
}));

jest.mock("@/features/hr/documents/document-filters", () => ({
  DocumentFilters: () => null,
  DOCUMENT_TYPES: [],
}));

jest.mock("@/features/hr/documents/document-table", () => ({
  DocumentTable: ({
    documents,
    onClassify,
  }: {
    documents: { id: number; name: string }[];
    onClassify?: (doc: { id: number; name: string }) => void;
  }) => (
    <>
      {documents.map((d) => (
        <div key={d.id} data-testid="document-row">
          {d.name}
        </div>
      ))}
      {onClassify ? <div data-testid="classification-offered" /> : null}
    </>
  ),
}));

jest.mock("@/features/hr/documents/components/document-classification-sheet", () => ({
  DocumentClassificationSheet: () => <div data-testid="classification-sheet" />,
}));

jest.mock("@/features/hr/documents/new-folder-dialog", () => ({
  NewFolderDialog: () => null,
}));

jest.mock("@/features/hr/documents/edit-document-sheet", () => ({
  EditDocumentSheet: () => null,
}));

jest.mock("@/features/hr/documents/rich-documents-section", () => ({
  RichDocumentsSection: () => null,
}));

jest.mock("@/features/hr/documents/documents-extended-section", () => ({
  DocumentsExtendedSection: () => null,
}));

jest.mock("@/features/hr/documents/document-page-actions", () => ({
  DocumentPageActions: () => null,
}));

jest.mock("@/features/hr/documents/document-page-states", () => ({
  DocumentLibrarySkeleton: () => null,
  DocumentLibraryState: () => null,
}));

import { DocumentsPage } from "./documents-page";

const seededDocuments = {
  data: [
    {
      id: 1,
      orgId: "org-1",
      userId: null,
      departmentId: null,
      name: "Employment Contract.pdf",
      description: null,
      type: "CONTRACT" as const,
      category: null,
      hasFile: true,
      fileName: "Employment Contract.pdf",
      fileSize: 102400,
      mimeType: "application/pdf",
      version: 1,
      parentDocumentId: null,
      isPublic: false,
      isActive: true,
      classification: "PERSONAL" as const,
      effectiveDate: null,
      expiryDate: null,
      expiryReminderSent: null,
      tags: null,
      metadata: null,
      uploadedBy: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  pageInfo: { limit: 20, hasMore: false, nextCursor: null },
};

function makeHydratedState() {
  const seed = new QueryClient();
  seed.setQueryData(queryKeys.hr.documents({ limit: 20 }), seededDocuments);
  return dehydrate(seed);
}

function Wrapper({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </TooltipProvider>
  );
}

function documentListCalls(): unknown[][] {
  return (apiClient.get as jest.Mock).mock.calls.filter(
    (call) => call[0] === "/hr/documents",
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
  mockScope.mockReturnValue("all");
  mockHrKbLinkFlags.mockReturnValue({ link: false, search: false, ai: false });
});

describe("DocumentsPage server-prefetch seam", () => {
  it("renders rows from the hydrated cache and makes no documents API call", () => {
    const state = makeHydratedState();
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <HydrationBoundary state={state}>
          <DocumentsPage />
        </HydrationBoundary>
      </Wrapper>,
    );

    expect(screen.getByText("Employment Contract.pdf")).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalledWith(
      "/hr/documents",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(documentListCalls()).toEqual([]);
  });

  it("fetches from the API when HydrationBoundary carries no cache", async () => {
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <DocumentsPage />
      </Wrapper>,
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/documents",
      { limit: 20 },
      expect.anything(),
      expect.any(Function),
    );
    const [call] = documentListCalls();
    expect(call).toBeDefined();
    await expect((call?.[3] as () => Promise<unknown>)()).resolves.toBe(
      documentListContract,
    );
  });
});

describe("DocumentsPage classification and sharing", () => {
  function renderHydrated() {
    render(
      <Wrapper client={new QueryClient()}>
        <HydrationBoundary state={makeHydratedState()}>
          <DocumentsPage />
        </HydrationBoundary>
      </Wrapper>,
    );
  }

  it("offers classification and mounts its sheet for someone who holds the document permissions across the organisation, with the feature on", () => {
    mockHrKbLinkFlags.mockReturnValue({ link: true, search: false, ai: false });

    renderHydrated();

    expect(screen.getByTestId("classification-offered")).toBeInTheDocument();
    expect(screen.getByTestId("classification-sheet")).toBeInTheDocument();
  });

  it.each<DataScope>(["team", "own", "none"])(
    "offers nothing and mounts no sheet for a manager whose document scope is %s, although useCan says they may manage documents",
    (scope) => {
      mockScope.mockReturnValue(scope);
      mockHrKbLinkFlags.mockReturnValue({ link: true, search: false, ai: false });

      renderHydrated();

      expect(screen.getByTestId("document-row")).toBeInTheDocument();
      expect(screen.queryByTestId("classification-offered")).not.toBeInTheDocument();
      expect(screen.queryByTestId("classification-sheet")).not.toBeInTheDocument();
    },
  );

  it("offers nothing while the feature is off, even to someone who holds the permissions across the organisation", () => {
    renderHydrated();

    expect(screen.getByTestId("document-row")).toBeInTheDocument();
    expect(screen.queryByTestId("classification-offered")).not.toBeInTheDocument();
  });
});
