import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useDeleteQuarantined, useRejectQuarantined, useReleaseQuarantined } from "@/hooks/api/storage/quarantine";
import type { QuarantineList, QuarantineRecord } from "@/hooks/api/storage/quarantine-schema";

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: object) => useMutation(options),
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { post: jest.fn(), delete: jest.fn() } }));

const row = (id: string): QuarantineRecord => ({
  id,
  orgId: "org",
  storageKey: `k/${id}`,
  filename: `${id}.pdf`,
  mimeType: "application/pdf",
  fileSizeBytes: 10,
  sha256: "x",
  status: "pending_scan",
  threatName: null,
  idempotencyKey: null,
  uploadedBy: "u-1",
  createdAt: "2026-10-01T00:00:00Z",
});

let client: QueryClient;
const allKey = platformCoreQueryKeys.privacy.quarantine({ limit: 20 });
const pendingKey = platformCoreQueryKeys.privacy.quarantine({ status: "pending_scan", limit: 20 });

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function page(...ids: string[]): QuarantineList {
  return { data: ids.map(row), pagination: { limit: 20, nextCursor: null, hasMore: false } };
}

beforeEach(() => {
  (apiClient.post as jest.Mock).mockReset();
  (apiClient.delete as jest.Mock).mockReset();
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(allKey, page("a", "b"));
  client.setQueryData(pendingKey, page("a"));
});

it("patches the released row in every loaded list from the response", async () => {
  (apiClient.post as jest.Mock).mockResolvedValue({ status: "clean" });
  const { result } = renderHook(() => useReleaseQuarantined(), { wrapper });
  await result.current.mutateAsync("a");
  expect(client.getQueryData<QuarantineList>(allKey)?.data.map((r) => r.status)).toEqual(["clean", "pending_scan"]);
  expect(client.getQueryData<QuarantineList>(pendingKey)?.data[0]?.status).toBe("clean");
});

it("records the rejection reason as the threat name", async () => {
  (apiClient.post as jest.Mock).mockResolvedValue({ status: "infected" });
  const { result } = renderHook(() => useRejectQuarantined(), { wrapper });
  await result.current.mutateAsync({ id: "b", reason: "phishing" });
  expect((apiClient.post as jest.Mock).mock.calls[0]?.[1]).toEqual({ reason: "phishing" });
  expect(client.getQueryData<QuarantineList>(allKey)?.data[1]).toMatchObject({ status: "infected", threatName: "phishing" });
});

it("drops a deleted row from every loaded list", async () => {
  (apiClient.delete as jest.Mock).mockResolvedValue({ deleted: true });
  const { result } = renderHook(() => useDeleteQuarantined(), { wrapper });
  await result.current.mutateAsync("a");
  expect(client.getQueryData<QuarantineList>(allKey)?.data.map((r) => r.id)).toEqual(["b"]);
  expect(client.getQueryData<QuarantineList>(pendingKey)?.data).toEqual([]);
});
