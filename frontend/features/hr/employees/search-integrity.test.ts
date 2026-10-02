import { renderHook } from "@testing-library/react";
import {
  employeeSearchScopeKey,
  useSearchIntegrity,
  type SearchIntegrityInput,
} from "./search-integrity";

const SCOPE = employeeSearchScopeKey({ isActive: "all" });

function settled(overrides: Partial<SearchIntegrityInput>): SearchIntegrityInput {
  return {
    scopeKey: SCOPE,
    isSearching: false,
    isSettled: true,
    rowCount: 0,
    ...overrides,
  };
}

describe("search integrity — HRMS-SEARCH-001 must fail loudly, never silently empty", () => {
  it("reports a failure when a search returns zero over a scope already known non-empty", () => {
    const { result, rerender } = renderHook(
      (input: SearchIntegrityInput) => useSearchIntegrity(input),
      { initialProps: settled({ rowCount: 12 }) },
    );

    expect(result.current).toBe(false);

    rerender(settled({ isSearching: true, rowCount: 0 }));

    expect(result.current).toBe(true);
  });

  it("stays quiet on a legitimately empty organization, where no scope was ever non-empty", () => {
    const { result, rerender } = renderHook(
      (input: SearchIntegrityInput) => useSearchIntegrity(input),
      { initialProps: settled({ rowCount: 0 }) },
    );

    rerender(settled({ isSearching: true, rowCount: 0 }));

    expect(result.current).toBe(false);
  });

  it("stays quiet while the query is still in flight", () => {
    const { result, rerender } = renderHook(
      (input: SearchIntegrityInput) => useSearchIntegrity(input),
      { initialProps: settled({ rowCount: 12 }) },
    );

    rerender(settled({ isSearching: true, isSettled: false, rowCount: 0 }));

    expect(result.current).toBe(false);
  });

  it("stays quiet when the search found rows", () => {
    const { result, rerender } = renderHook(
      (input: SearchIntegrityInput) => useSearchIntegrity(input),
      { initialProps: settled({ rowCount: 12 }) },
    );

    rerender(settled({ isSearching: true, rowCount: 1 }));

    expect(result.current).toBe(false);
  });

  it("does not carry one scope's knowledge into another filter scope", () => {
    const other = employeeSearchScopeKey({ isActive: "false", departmentId: "d-9" });
    const { result, rerender } = renderHook(
      (input: SearchIntegrityInput) => useSearchIntegrity(input),
      { initialProps: settled({ rowCount: 12 }) },
    );

    rerender(settled({ scopeKey: other, isSearching: true, rowCount: 0 }));

    expect(result.current).toBe(false);
  });
});
