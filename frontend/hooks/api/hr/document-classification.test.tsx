import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { DataScope } from "@/hooks/api/access-schema";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import {
  useCanClassifyDocuments,
  useCanReadDocumentSharing,
  useClassifyDocument,
  useDocumentClassification,
  useSetDocumentAudiences,
  type ClassifyDocumentResult,
  type DocumentClassificationView,
  type SetDocumentAudiencesInput,
  type SetDocumentAudiencesResult,
} from "./document-classification";
import { useDocumentKbLink } from "./document-kb-link";

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockPut = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...a: unknown[]) => mockGet(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    put: (...a: unknown[]) => mockPut(...a),
  },
}));

const mockCan = jest.fn<boolean, [string]>();
const mockScope = jest.fn<DataScope, [string]>();
const mockModuleEnabled = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan(key),
  useScope: (key: string) => mockScope(key),
  useModuleEnabled: (key: string) => mockModuleEnabled(key),
  useAccess: () => ({ data: {}, refetch: jest.fn() }),
}));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const classificationKey = humanResourcesQueryKeys.hr.documentClassification(7);
const kbLinkKey = humanResourcesQueryKeys.hr.documentKbLink(7);
const versionsKey = humanResourcesQueryKeys.hr.documentVersions(7);
const listKey = humanResourcesQueryKeys.hr.documents({ limit: 20 });
const linkedListKey = knowledgeAndSurveysQueryKeys.kb.linkedDocuments({ limit: 20 });

const before: DocumentClassificationView = {
  documentId: 7,
  classification: "INTERNAL",
  effectiveDate: null,
  audiences: [],
  publishable: true,
  blockers: [],
};
const classified: ClassifyDocumentResult = { ...before, classification: "CONFIDENTIAL", linksTakenDown: 1 };
const shared: SetDocumentAudiencesResult = {
  ...before,
  audiences: [{ id: 1, kind: "DEPARTMENT", refId: "d1", label: "Finance" }],
  linkAudiencesNarrowed: 2,
};

/** Every cache the document can be read from, filled so that "was it invalidated" is a fact about the cache and not about a spy. */
function seedCaches() {
  client.setQueryData(classificationKey, before);
  client.setQueryData(kbLinkKey, { documentId: 7 });
  client.setQueryData(versionsKey, { documentId: 7 });
  client.setQueryData(listKey, { data: [] });
  client.setQueryData(linkedListKey, { data: [] });
}

function isInvalidated(key: readonly unknown[]): boolean {
  return client.getQueryState(key)?.isInvalidated === true;
}

function holdAt(view: DataScope, manage: DataScope = view) {
  mockScope.mockImplementation((key) => (key === "hr:documents:manage" ? manage : view));
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mockCan.mockReturnValue(true);
  mockModuleEnabled.mockReturnValue(true);
  holdAt("all");
});

describe("useDocumentClassification", () => {
  it("reads the document's classification for someone who may see every document", async () => {
    mockGet.mockResolvedValue(before);

    const { result } = renderHook(() => useDocumentClassification(7), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(before));
    expect(mockGet).toHaveBeenCalledWith("/hr/documents/7/classification", undefined, expect.anything(), expect.anything());
  });

  it.each<DataScope>(["team", "own", "none"])(
    "sends no request for a caller who holds the permission at scope %s, because the server refuses it",
    (scope) => {
      holdAt(scope);

      renderHook(() => useDocumentClassification(7), { wrapper });

      expect(mockCan).toHaveBeenCalledWith("hr:documents:view");
      expect(mockGet).not.toHaveBeenCalled();
    },
  );

  it("sends no request without the permission even at scope all, without a document, or while the caller has not opened it", () => {
    mockCan.mockReturnValue(false);
    renderHook(() => useDocumentClassification(7), { wrapper });
    mockCan.mockReturnValue(true);
    renderHook(() => useDocumentClassification(null), { wrapper });
    renderHook(() => useDocumentClassification(7, { enabled: false }), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("useCanReadDocumentSharing and useCanClassifyDocuments", () => {
  it("are true only for a caller who holds view and manage across the whole organisation", () => {
    const read = renderHook(() => useCanReadDocumentSharing(), { wrapper });
    const classify = renderHook(() => useCanClassifyDocuments(), { wrapper });

    expect(read.result.current).toBe(true);
    expect(classify.result.current).toBe(true);
  });

  it("are false for a manager whose scope is a team, although useCan says they hold the permission", () => {
    holdAt("team");

    const read = renderHook(() => useCanReadDocumentSharing(), { wrapper });
    const classify = renderHook(() => useCanClassifyDocuments(), { wrapper });

    expect(read.result.current).toBe(false);
    expect(classify.result.current).toBe(false);
  });

  it("need both keys unrestricted: reading everything is not enough to change it", () => {
    holdAt("all", "team");
    expect(renderHook(() => useCanReadDocumentSharing(), { wrapper }).result.current).toBe(true);
    expect(renderHook(() => useCanClassifyDocuments(), { wrapper }).result.current).toBe(false);

    holdAt("team", "all");
    expect(renderHook(() => useCanReadDocumentSharing(), { wrapper }).result.current).toBe(false);
    expect(renderHook(() => useCanClassifyDocuments(), { wrapper }).result.current).toBe(false);
  });

  it("fail closed for someone whose manage key is absent even when the scope answer says all", () => {
    mockCan.mockImplementation((key) => key !== "hr:documents:manage");

    expect(renderHook(() => useCanClassifyDocuments(), { wrapper }).result.current).toBe(false);
  });
});

describe("useClassifyDocument", () => {
  it("puts the answer straight into the cache and refreshes the HR list, the document's own state and the Knowledge Base lists", async () => {
    seedCaches();
    mockPatch.mockResolvedValue(classified);
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useClassifyDocument(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ documentId: 7, classification: "CONFIDENTIAL" });
    });

    expect(mockPatch).toHaveBeenCalledWith("/hr/documents/7/classification", { classification: "CONFIDENTIAL" }, undefined, expect.anything());
    expect(client.getQueryData(classificationKey)).toEqual(classified);
    expect(spy).toHaveBeenCalledWith({ queryKey: humanResourcesQueryKeys.hr.documentsAll });
    expect(spy).toHaveBeenCalledWith({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocumentsAll });
    expect(isInvalidated(listKey)).toBe(true);
    expect(isInvalidated(kbLinkKey)).toBe(true);
    expect(isInvalidated(linkedListKey)).toBe(true);
  });

  it("sends nothing for someone without the permission to manage documents", async () => {
    mockCan.mockReturnValue(false);

    const { result } = renderHook(() => useClassifyDocument(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ documentId: 7, classification: "CONFIDENTIAL" })).rejects.toThrow("Missing permission: hr:documents:manage");
    });

    expect(mockPatch).not.toHaveBeenCalled();
  });
});

describe("useSetDocumentAudiences", () => {
  const input: SetDocumentAudiencesInput = { documentId: 7, audiences: [{ kind: "DEPARTMENT", refId: "d1" }] };

  it("puts the answer into the cache and refreshes the document's Knowledge Base link state and every Knowledge Base list", async () => {
    seedCaches();
    mockPut.mockResolvedValue(shared);
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSetDocumentAudiences(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(mockPut).toHaveBeenCalledWith("/hr/documents/7/audiences", { audiences: input.audiences }, undefined, expect.anything());
    expect(client.getQueryData(classificationKey)).toEqual(shared);
    expect(spy).toHaveBeenCalledWith({ queryKey: humanResourcesQueryKeys.hr.documentKbLink(7) });
    expect(spy).toHaveBeenCalledWith({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocumentsAll });
    expect(isInvalidated(kbLinkKey)).toBe(true);
    expect(isInvalidated(linkedListKey)).toBe(true);
  });

  it("invalidates only this document's link state, not another document's", async () => {
    const otherKbLinkKey = humanResourcesQueryKeys.hr.documentKbLink(8);
    client.setQueryData(otherKbLinkKey, { documentId: 8 });
    seedCaches();
    mockPut.mockResolvedValue(shared);

    const { result } = renderHook(() => useSetDocumentAudiences(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(isInvalidated(kbLinkKey)).toBe(true);
    expect(isInvalidated(otherKbLinkKey)).toBe(false);
  });

  it("refetches the link state once the PUT has landed, so its reader sees the new audience and not the one from before the write", async () => {
    let audiencesSaved = false;
    mockGet.mockImplementation(() => Promise.resolve({ documentId: 7, documentAudiences: audiencesSaved ? shared.audiences : [] }));
    mockPut.mockImplementation(() => {
      audiencesSaved = true;
      return Promise.resolve(shared);
    });
    const link = renderHook(() => useDocumentKbLink(7), { wrapper });
    await waitFor(() => expect(link.result.current.data?.documentAudiences).toEqual([]));

    const { result } = renderHook(() => useSetDocumentAudiences(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(input);
    });

    await waitFor(() => expect(link.result.current.data?.documentAudiences).toEqual(shared.audiences));
  });

  it("keeps the answer to the PUT when a read that began before it finishes afterwards", async () => {
    let releaseStaleRead: (view: DocumentClassificationView) => void = () => {};
    mockGet.mockImplementation(
      () =>
        new Promise<DocumentClassificationView>((resolve) => {
          releaseStaleRead = resolve;
        }),
    );
    mockPut.mockResolvedValue(shared);
    renderHook(() => useDocumentClassification(7), { wrapper });
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    const { result } = renderHook(() => useSetDocumentAudiences(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    await act(async () => {
      releaseStaleRead(before);
    });

    expect(client.getQueryData(classificationKey)).toEqual(shared);
  });

  it("sends nothing for someone without the permission to publish", async () => {
    mockCan.mockImplementation((key) => key !== "hr:documents:publish");

    const { result } = renderHook(() => useSetDocumentAudiences(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toThrow("Missing permission: hr:documents:publish");
    });

    expect(mockPut).not.toHaveBeenCalled();
  });
});
