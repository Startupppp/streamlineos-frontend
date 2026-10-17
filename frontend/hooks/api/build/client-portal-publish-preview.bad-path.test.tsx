import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import { usePublishPortal, useUnpublishPortal } from "./client-portal-management";

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn() },
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    _perm: string,
    options: {
      mutationFn: () => Promise<unknown>;
      onSuccess?: (data: unknown) => void;
    },
  ) => {
    const { useMutation } = jest.requireActual(
      "@tanstack/react-query",
    ) as typeof import("@tanstack/react-query");
    return useMutation({
      mutationFn: options.mutationFn,
      onSuccess: options.onSuccess,
    });
  },
}));

const mockedPost = apiClient.post as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("P1 — publish/unpublish refresh Preview", () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  it("invalidates preview query key on publish success", async () => {
    mockedPost.mockResolvedValue({
      portalPublishedAt: "2026-10-06T00:00:00.000Z",
      grantCount: 0,
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePublishPortal(29), { wrapper: localWrapper });
    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: buildWorkQueryKeys.projects.clientPortal.preview(29),
    });
  });

  it("invalidates preview query key on unpublish success", async () => {
    mockedPost.mockResolvedValue({ portalPublishedAt: null, grantCount: 0 });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUnpublishPortal(29), { wrapper: localWrapper });
    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: buildWorkQueryKeys.projects.clientPortal.preview(29),
    });
  });
});
