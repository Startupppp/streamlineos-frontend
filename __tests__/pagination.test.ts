import { describe, it, expect } from "vitest";
import {
  createPaginatedResponse,
  getOffset,
  paginationInputSchema,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from "@/lib/pagination";

describe("createPaginatedResponse", () => {
  it("creates correct pagination metadata", () => {
    const result = createPaginatedResponse(["a", "b", "c"], 10, 1, 3);
    expect(result.data).toEqual(["a", "b", "c"]);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(3);
    expect(result.pagination.total).toBe(10);
    expect(result.pagination.totalPages).toBe(4);
    expect(result.pagination.hasMore).toBe(true);
  });

  it("sets hasMore false on last page", () => {
    const result = createPaginatedResponse(["x"], 5, 3, 2);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasMore).toBe(false);
  });

  it("handles empty data", () => {
    const result = createPaginatedResponse([], 0, 1, 20);
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });

  it("handles single page", () => {
    const result = createPaginatedResponse([1, 2, 3], 3, 1, 10);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasMore).toBe(false);
  });
});

describe("getOffset", () => {
  it("calculates correct offset", () => {
    expect(getOffset(1, 20)).toBe(0);
    expect(getOffset(2, 20)).toBe(20);
    expect(getOffset(3, 10)).toBe(20);
    expect(getOffset(5, 25)).toBe(100);
  });
});

describe("paginationInputSchema", () => {
  it("validates valid input", () => {
    const result = paginationInputSchema.parse({ page: 1, limit: 20 });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("applies defaults", () => {
    const result = paginationInputSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("rejects page < 1", () => {
    expect(() => paginationInputSchema.parse({ page: 0 })).toThrow();
  });

  it("rejects limit > 100", () => {
    expect(() => paginationInputSchema.parse({ limit: 101 })).toThrow();
  });
});

describe("constants", () => {
  it("has correct defaults", () => {
    expect(DEFAULT_PAGE).toBe(1);
    expect(DEFAULT_LIMIT).toBe(20);
    expect(MAX_LIMIT).toBe(100);
  });
});
