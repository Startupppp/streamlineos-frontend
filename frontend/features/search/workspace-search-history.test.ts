import { act, renderHook } from "@testing-library/react";
import { orgScopedStorageKey } from "@/lib/org-scoped-storage";
import {
  addSearchHistory,
  parseSearchHistory,
  useWorkspaceSearchHistory,
} from "./workspace-search-history";

let storageScope = "authenticated:org-a:user-a";

jest.mock("@/lib/org-scoped-storage", () => {
  const actual = jest.requireActual("@/lib/org-scoped-storage");
  return {
    ...actual,
    useOrgStorageScope: () => storageScope,
  };
});

describe("workspace search history", () => {
  it("deduplicates case-insensitively and keeps the newest query first", () => {
    expect(addSearchHistory(["Payroll", "Acme"], " acme ")).toEqual(["acme", "Payroll"]);
  });

  it("ignores invalid persisted values", () => {
    expect(parseSearchHistory("not-json")).toEqual([]);
    expect(parseSearchHistory(JSON.stringify({ query: "acme" }))).toEqual([]);
  });

  it("stores history under the current organization and actor scope", () => {
    storageScope = "authenticated:org-isolated:user-isolated";
    const { result } = renderHook(() => useWorkspaceSearchHistory());

    act(() => result.current.remember("STRE"));

    const key = orgScopedStorageKey("build-search-history", storageScope);
    expect(localStorage.getItem(key)).toBe(JSON.stringify(["STRE"]));
    expect(localStorage.getItem("build-search-history")).toBeNull();
  });

  it("reconciles same-scope history written by another tab", () => {
    storageScope = "authenticated:org-cross-tab:user-cross-tab";
    const key = orgScopedStorageKey("build-search-history", storageScope);
    const { result } = renderHook(() => useWorkspaceSearchHistory());

    act(() => {
      localStorage.setItem(key, JSON.stringify(["Product alpha"]));
      window.dispatchEvent(new StorageEvent("storage", { key }));
    });

    expect(result.current.history).toEqual(["Product alpha"]);
  });
});
