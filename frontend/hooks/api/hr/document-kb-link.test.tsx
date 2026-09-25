import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { DataScope } from "@/hooks/api/access-schema";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import {
  useApproveDocumentVersion,
  useDocumentKbLink,
  useDocumentVersions,
  usePublishDocumentToKb,
  useUploadDocumentVersion,
  useWithdrawDocumentFromKb,
} from "./document-kb-link";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a), delete: (...a: unknown[]) => mockDelete(...a) },
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

const state = { documentId: 7, link: null, publishable: true, blockers: [], documentAudiences: [] };
const versions = { documentId: 7, currentVersion: 2, versions: [] };

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mockCan.mockReturnValue(true);
  mockScope.mockReturnValue("all");
  mockModuleEnabled.mockReturnValue(true);
});

describe("useDocumentKbLink and useDocumentVersions", () => {
  it("read the document's own routes when HR is on and the person may view documents", async () => {
    mockGet.mockResolvedValue(state);

    renderHook(() => useDocumentKbLink(7), { wrapper });
    renderHook(() => useDocumentVersions(7), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/hr/documents/7/kb-link", undefined, expect.anything(), expect.anything()));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/hr/documents/7/versions", undefined, expect.anything(), expect.anything()));
  });

  it("do not ask while the HR module is off, so a tenant without HR never calls a route that does not exist for it", () => {
    mockModuleEnabled.mockReturnValue(false);

    renderHook(() => useDocumentKbLink(7), { wrapper });
    renderHook(() => useDocumentVersions(7), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it("do not ask without the permission to view documents, or without a document", () => {
    mockCan.mockReturnValue(false);
    renderHook(() => useDocumentKbLink(7), { wrapper });
    renderHook(() => useDocumentVersions(7), { wrapper });
    mockCan.mockReturnValue(true);
    renderHook(() => useDocumentKbLink(null), { wrapper });
    renderHook(() => useDocumentVersions(null), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it.each<DataScope>(["team", "own", "none"])(
    "do not ask a caller who holds the view permission at scope %s, because both routes refuse anyone below the whole organisation",
    (scope) => {
      mockScope.mockReturnValue(scope);

      renderHook(() => useDocumentKbLink(7), { wrapper });
      renderHook(() => useDocumentVersions(7), { wrapper });

      expect(mockCan).toHaveBeenCalledWith("hr:documents:view");
      expect(mockScope).toHaveBeenCalledWith("hr:documents:view");
      expect(mockGet).not.toHaveBeenCalled();
    },
  );
});

describe("usePublishDocumentToKb and useWithdrawDocumentFromKb", () => {
  it("publish sends no audiences unless the caller narrows them, and puts the answer straight into the cache", async () => {
    const live = { ...state, link: { id: 31 } };
    mockPost.mockResolvedValue(live);

    const { result } = renderHook(() => usePublishDocumentToKb(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ documentId: 7 });
    });

    expect(mockPost).toHaveBeenCalledWith("/hr/documents/7/kb-link", {}, undefined, expect.anything());
    expect(client.getQueryData(humanResourcesQueryKeys.hr.documentKbLink(7))).toEqual(live);
  });

  it("publish refreshes the Knowledge Base lists and the document's own view, because the entry it made is now on both", async () => {
    mockPost.mockResolvedValue(state);
    client.setQueryData(humanResourcesQueryKeys.hr.documentClassification(7), { documentId: 7 });
    client.setQueryData(knowledgeAndSurveysQueryKeys.kb.linkedDocuments({ limit: 20 }), { data: [] });
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => usePublishDocumentToKb(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ documentId: 7 });
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocumentsAll });
    expect(spy).toHaveBeenCalledWith({ queryKey: humanResourcesQueryKeys.hr.documentClassification(7) });
    expect(client.getQueryState(knowledgeAndSurveysQueryKeys.kb.linkedDocuments({ limit: 20 }))?.isInvalidated).toBe(true);
  });

  it("publish sends the narrowed audiences when the caller gives them", async () => {
    mockPost.mockResolvedValue(state);

    const { result } = renderHook(() => usePublishDocumentToKb(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ documentId: 7, audiences: [{ kind: "DEPARTMENT", refId: "d1" }] });
    });

    expect(mockPost).toHaveBeenCalledWith("/hr/documents/7/kb-link", { audiences: [{ kind: "DEPARTMENT", refId: "d1" }] }, undefined, expect.anything());
  });

  it("withdraw deletes the entry's link with the reason given, and refreshes every list that could show it", async () => {
    mockDelete.mockResolvedValue(state);
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useWithdrawDocumentFromKb(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ documentId: 7, reason: "Superseded by the 2026 handbook" });
    });

    expect(mockDelete).toHaveBeenCalledWith("/hr/documents/7/kb-link", { reason: "Superseded by the 2026 handbook" }, undefined, expect.anything());
    expect(spy).toHaveBeenCalledWith({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocumentsAll });
  });

  it("neither sends anything for someone without the permission to publish", async () => {
    mockCan.mockReturnValue(false);

    const { result } = renderHook(() => usePublishDocumentToKb(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ documentId: 7 })).rejects.toThrow("Missing permission: hr:documents:publish");
    });

    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe("useUploadDocumentVersion and useApproveDocumentVersion", () => {
  it("upload sends the stored file's key and needs only the manage permission", async () => {
    mockPost.mockResolvedValue(versions);

    const { result } = renderHook(() => useUploadDocumentVersion(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ documentId: 7, fileUrl: "org/hr-documents/a.pdf", fileName: "a.pdf" });
    });

    expect(mockPost).toHaveBeenCalledWith("/hr/documents/7/versions", { fileUrl: "org/hr-documents/a.pdf", fileName: "a.pdf" }, undefined, expect.anything());
    expect(mockCan).toHaveBeenCalledWith("hr:documents:manage");
  });

  it("approve needs the publish permission, and refreshes the HR list, the entry and its readers because the file everyone reads changed", async () => {
    mockPost.mockResolvedValue(versions);
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useApproveDocumentVersion(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ documentId: 7, version: 2 });
    });

    expect(mockPost).toHaveBeenCalledWith("/hr/documents/7/versions/2/approve", undefined, undefined, expect.anything());
    expect(mockCan).toHaveBeenCalledWith("hr:documents:publish");
    expect(spy).toHaveBeenCalledWith({ queryKey: humanResourcesQueryKeys.hr.documentsAll });
    expect(spy).toHaveBeenCalledWith({ queryKey: humanResourcesQueryKeys.hr.documentKbLink(7) });
    expect(spy).toHaveBeenCalledWith({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocumentsAll });
  });
});
