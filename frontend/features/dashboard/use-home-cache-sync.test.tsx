import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useHomeCacheSync } from "./use-home-cache-sync";
import { queryKeys } from "@/lib/query-keys";

const mockUseAccess = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
}));

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("Home cache follows the backend permission version", () => {
  let client: QueryClient;
  let invalidate: jest.SpyInstance;

  beforeEach(() => {
    client = new QueryClient();
    invalidate = jest
      .spyOn(client, "invalidateQueries")
      .mockResolvedValue(undefined);
    mockUseAccess.mockReset();
  });

  it("does not invalidate on the first resolved snapshot", () => {
    mockUseAccess.mockReturnValue({ data: { version: 7 } });
    renderHook(() => useHomeCacheSync(), { wrapper: wrapperFor(client) });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("does not invalidate while the snapshot is unresolved", () => {
    mockUseAccess.mockReturnValue({ data: undefined });
    const { rerender } = renderHook(() => useHomeCacheSync(), {
      wrapper: wrapperFor(client),
    });
    rerender();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("invalidates the whole Home namespace when the version moves", () => {
    mockUseAccess.mockReturnValue({ data: { version: 7 } });
    const { rerender } = renderHook(() => useHomeCacheSync(), {
      wrapper: wrapperFor(client),
    });
    mockUseAccess.mockReturnValue({ data: { version: 8 } });
    rerender();
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard.all,
    });
  });

  it("does not invalidate again while the version holds steady", () => {
    mockUseAccess.mockReturnValue({ data: { version: 7 } });
    const { rerender } = renderHook(() => useHomeCacheSync(), {
      wrapper: wrapperFor(client),
    });
    mockUseAccess.mockReturnValue({ data: { version: 8 } });
    rerender();
    rerender();
    rerender();
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

describe("the Home cache key dimensions match the backend key", () => {
  const backendKeyBuilder = readFileSync(
    resolve(
      process.cwd(),
      "../backend/src/modules/dashboard/dashboard-cache-key.ts",
    ),
    "utf8",
  );

  it("reads the backend key builder, so an empty sweep cannot pass", () => {
    expect(backendKeyBuilder).toContain("buildScopedDashboardCacheKey");
  });

  it("keys the backend cache on organization, actor, permission version and scope", () => {
    expect(backendKeyBuilder).toContain("u${u.userId}");
    expect(backendKeyBuilder).toContain("v${version}");
    expect(backendKeyBuilder).toContain("${scope}");
  });

  it("mirrors the permission-version dimension on the client", () => {
    const source = readFileSync(
      resolve(process.cwd(), "features", "dashboard", "use-home-cache-sync.ts"),
      "utf8",
    );
    expect(source).toContain("data?.version");
    expect(source).toContain("queryKeys.dashboard.all");
  });
});
