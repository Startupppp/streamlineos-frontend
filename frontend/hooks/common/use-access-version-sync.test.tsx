import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { isAccessNamespaceKey, useAccessVersionSync } from "./use-access-version-sync";
import { queryKeys } from "@/lib/query-keys";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { backendPath } from "@/test-utils/backend-repo";

const mockUseAccess = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
}));

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("the app cache follows the backend permission version", () => {
  let client: QueryClient;
  let invalidate: jest.SpyInstance;
  let remove: jest.SpyInstance;

  beforeEach(() => {
    client = new QueryClient();
    invalidate = jest.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
    remove = jest.spyOn(client, "removeQueries").mockReturnValue(undefined);
    mockUseAccess.mockReset();
  });

  it("does not act on the first resolved snapshot", () => {
    mockUseAccess.mockReturnValue({ data: { version: 7 } });
    renderHook(() => useAccessVersionSync(), { wrapper: wrapperFor(client) });
    expect(invalidate).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("does not act while the snapshot is unresolved", () => {
    mockUseAccess.mockReturnValue({ data: undefined });
    const { rerender } = renderHook(() => useAccessVersionSync(), {
      wrapper: wrapperFor(client),
    });
    rerender();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("evicts and refetches once when the version moves", () => {
    mockUseAccess.mockReturnValue({ data: { version: 7 } });
    const { rerender } = renderHook(() => useAccessVersionSync(), {
      wrapper: wrapperFor(client),
    });
    mockUseAccess.mockReturnValue({ data: { version: 8 } });
    rerender();
    rerender();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ type: "inactive" }));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ refetchType: "active" }),
    );
  });

  it("sweeps each newer version once", () => {
    mockUseAccess.mockReturnValue({ data: { version: 7 } });
    const { rerender } = renderHook(() => useAccessVersionSync(), {
      wrapper: wrapperFor(client),
    });
    mockUseAccess.mockReturnValue({ data: { version: 8 } });
    rerender();
    mockUseAccess.mockReturnValue({ data: { version: 9 } });
    rerender();

    expect(remove).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});

describe("the sweep reaches every namespace except its own input", () => {
  it("excludes the access namespace", () => {
    expect(isAccessNamespaceKey(queryKeys.access.me())).toBe(true);
    expect(isAccessNamespaceKey(queryKeys.access.all)).toBe(true);
  });

  it("includes dashboard and collaboration namespaces", () => {
    expect(isAccessNamespaceKey(queryKeys.dashboard.all)).toBe(false);
    expect(isAccessNamespaceKey(collaborationQueryKeys.dashboard.all)).toBe(false);
  });

  it("includes module namespaces", () => {
    expect(isAccessNamespaceKey(queryKeys.hr.all)).toBe(false);
    expect(isAccessNamespaceKey(queryKeys.projects.all)).toBe(false);
  });
});

describe("the client cache key dimensions match the backend key", () => {
  const backendKeyBuilder = readFileSync(
    backendPath("src", "modules", "dashboard", "dashboard-cache-key.ts"),
    "utf8",
  );

  it("reads the backend key builder", () => {
    expect(backendKeyBuilder).toContain("buildScopedDashboardCacheKey");
  });

  it("keys the backend cache on permission version and scoped reader", () => {
    expect(backendKeyBuilder).toContain("v${version}");
    expect(backendKeyBuilder).toContain("${read.discriminator}");

    const scopedReadSource = readFileSync(
      backendPath("src", "modules", "access", "scoped-read.ts"),
      "utf8",
    );
    expect(scopedReadSource).toContain("get discriminator()");
    expect(scopedReadSource).toContain("this.actorId");
  });

  it("mirrors the permission-version dimension on the client", () => {
    const source = readFileSync(
      resolve(process.cwd(), "hooks", "common", "use-access-version-sync.ts"),
      "utf8",
    );
    expect(source).toContain("data?.version");
  });
});
