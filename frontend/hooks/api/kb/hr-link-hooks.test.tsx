import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useHrKbLinkFlags, useHrKbLinkFlagsAdmin, useUpdateHrKbLinkFlags } from "./hr-link-config";
import { useLinkedDocuments, useOpenLinkedDocument } from "./linked-documents";

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockPost = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...a: unknown[]) => mockGet(...a), patch: (...a: unknown[]) => mockPatch(...a), post: (...a: unknown[]) => mockPost(...a) },
}));

const mockAllowed = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: (key: string) => ({ allowed: mockAllowed(key), state: "ready" }),
  useCan: (key: string) => mockAllowed(key),
  useAccess: () => ({ data: {}, refetch: jest.fn() }),
}));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mockAllowed.mockReturnValue(true);
});

describe("useHrKbLinkFlags", () => {
  it("is all off until the server has answered, so the feature never flashes on", () => {
    mockGet.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useHrKbLinkFlags(), { wrapper });

    expect(result.current).toEqual({ link: false, search: false, ai: false });
  });

  it("returns what the server says once it arrives", async () => {
    mockGet.mockResolvedValue({ link: true, search: false, ai: false });

    const { result } = renderHook(() => useHrKbLinkFlags(), { wrapper });

    await waitFor(() => expect(result.current.link).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/kb/hr-link/config", undefined, expect.anything(), expect.anything());
  });

  it("stays off, and never asks, for someone who cannot view the Knowledge Base", () => {
    mockAllowed.mockReturnValue(false);

    const { result } = renderHook(() => useHrKbLinkFlags(), { wrapper });

    expect(result.current).toEqual({ link: false, search: false, ai: false });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("stays off when the request fails", async () => {
    mockGet.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useHrKbLinkFlags(), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current).toEqual({ link: false, search: false, ai: false });
  });
});

describe("useHrKbLinkFlagsAdmin and useUpdateHrKbLinkFlags", () => {
  it("only asks for the administrator's view when the person may manage Knowledge Base settings", () => {
    mockAllowed.mockImplementation((key) => key !== "kb:settings:manage");

    renderHook(() => useHrKbLinkFlagsAdmin(), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it("writes the new effective switches into the cache the readers use, so the UI follows at once", async () => {
    const result = { stored: { link: true, search: false, ai: false }, effective: { link: true, search: false, ai: false }, hrModuleEnabled: true };
    mockPatch.mockResolvedValue(result);
    client.setQueryData(knowledgeAndSurveysQueryKeys.kb.hrLinkConfig(), { link: false, search: false, ai: false });

    const { result: hook } = renderHook(() => useUpdateHrKbLinkFlags(), { wrapper });
    await act(async () => {
      await hook.current.mutateAsync({ link: true });
    });

    expect(mockPatch).toHaveBeenCalledWith("/kb/settings/hr-link-flags", { link: true }, undefined, expect.anything());
    expect(client.getQueryData(knowledgeAndSurveysQueryKeys.kb.hrLinkConfig())).toEqual(result.effective);
    expect(client.getQueryData(knowledgeAndSurveysQueryKeys.kb.hrLinkFlagsAdmin())).toEqual(result);
  });

  it("refuses to send the change for someone without the permission, and sends nothing", async () => {
    mockAllowed.mockReturnValue(false);

    const { result: hook } = renderHook(() => useUpdateHrKbLinkFlags(), { wrapper });
    await act(async () => {
      await expect(hook.current.mutateAsync({ link: true })).rejects.toThrow("Missing permission: kb:settings:manage");
    });

    expect(mockPatch).not.toHaveBeenCalled();
  });
});

describe("useLinkedDocuments", () => {
  it("asks for live entries without a status, and passes the cursor and limit", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: { limit: 10, hasMore: false, nextCursor: null } });

    renderHook(() => useLinkedDocuments({ limit: 10, cursor: "abc" }), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/kb/linked-documents", { limit: 10, cursor: "abc" }, expect.anything(), expect.anything()));
  });

  it("names the status when a publisher asks for entries that are not live", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: { limit: 30, hasMore: false, nextCursor: null } });

    renderHook(() => useLinkedDocuments({ status: "unpublished" }), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/kb/linked-documents", { limit: 30, status: "unpublished" }, expect.anything(), expect.anything()));
  });

  it("does not ask at all while the caller holds it back", () => {
    renderHook(() => useLinkedDocuments({ limit: 6 }, { enabled: false }), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("useOpenLinkedDocument", () => {
  it("posts to the entry's open route and hands back the short-lived link without caching it", async () => {
    mockPost.mockResolvedValue({ url: "https://files.example/signed", fileName: "coc.pdf", expiresIn: 300 });

    const { result } = renderHook(() => useOpenLinkedDocument(), { wrapper });
    let opened: { url: string } | undefined;
    await act(async () => {
      opened = await result.current.mutateAsync(31);
    });

    expect(mockPost).toHaveBeenCalledWith("/kb/linked-documents/31/open", undefined, undefined, expect.anything());
    expect(opened?.url).toBe("https://files.example/signed");
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
