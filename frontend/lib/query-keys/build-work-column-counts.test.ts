/**
 * @jest-environment node
 */
import { partialMatchKey } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "./build-work";

describe("buildWorkQueryKeys.projects.columnCounts — invalidation prefix contract", () => {
  it("argument-less key is strictly shorter than a filtered key", () => {
    const invalidationKey = buildWorkQueryKeys.projects.columnCounts(42);
    const filteredKey = buildWorkQueryKeys.projects.columnCounts(42, { search: "foo" });

    expect(invalidationKey.length).toBeLessThan(filteredKey.length);
  });

  it("argument-less key prefix-matches a filtered query key so invalidation fires", () => {
    const invalidationKey = buildWorkQueryKeys.projects.columnCounts(42);
    const filteredKey = buildWorkQueryKeys.projects.columnCounts(42, { search: "foo" });

    expect(partialMatchKey(filteredKey as QueryKey, invalidationKey as QueryKey)).toBe(true);
  });

  it("argument-less key prefix-matches the unfiltered query key (empty params object)", () => {
    const invalidationKey = buildWorkQueryKeys.projects.columnCounts(42);
    const unfilteredKey = buildWorkQueryKeys.projects.columnCounts(42, {});

    expect(invalidationKey.length).toBeLessThan(unfilteredKey.length);
    expect(partialMatchKey(unfilteredKey as QueryKey, invalidationKey as QueryKey)).toBe(true);
  });

  it("invalidation key for project A does not prefix-match a filtered key for project B", () => {
    const keyA = buildWorkQueryKeys.projects.columnCounts(1);
    const keyB = buildWorkQueryKeys.projects.columnCounts(2, { search: "foo" });

    expect(partialMatchKey(keyB as QueryKey, keyA as QueryKey)).toBe(false);
  });

  it("filtered keys with different filter values are distinct", () => {
    const key1 = buildWorkQueryKeys.projects.columnCounts(42, { search: "foo" });
    const key2 = buildWorkQueryKeys.projects.columnCounts(42, { search: "bar" });

    expect(partialMatchKey(key1 as QueryKey, key2 as QueryKey)).toBe(false);
    expect(partialMatchKey(key2 as QueryKey, key1 as QueryKey)).toBe(false);
  });
});
