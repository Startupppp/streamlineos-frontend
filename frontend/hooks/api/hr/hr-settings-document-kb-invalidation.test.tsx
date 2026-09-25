import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useDeleteDocument, useUpdateDocument } from "./hr-settings";

const mockPatch = jest.fn();
const mockDelete = jest.fn();
jest.mock("@/lib/api-client", () => ({ apiClient: { patch: (...a: unknown[]) => mockPatch(...a), delete: (...a: unknown[]) => mockDelete(...a), get: jest.fn() } }));

const mockCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan(key),
  useModuleEnabled: () => true,
  useAccess: () => ({ data: {}, refetch: jest.fn() }),
}));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mockCan.mockReturnValue(true);
  mockPatch.mockResolvedValue({ id: 1 });
  mockDelete.mockResolvedValue(undefined);
});

describe("editing or deleting an HR document refreshes the Knowledge Base entries built on it", () => {
  it("invalidates the linked-document lists after an edit", async () => {
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ documentId: 1, name: "Leave policy" });
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocumentsAll });
  });

  it("invalidates the linked-document lists after a delete", async () => {
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocumentsAll });
  });

  it("does not reach the server, and so invalidates nothing, for someone who may not manage documents", async () => {
    mockCan.mockReturnValue(false);
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteDocument(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(1)).rejects.toThrow(/hr:documents:manage/);
    });

    expect(mockDelete).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
