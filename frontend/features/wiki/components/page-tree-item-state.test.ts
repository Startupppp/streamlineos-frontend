import { resolvePageTreeExpanded } from "./page-tree-item";

it("derives expansion from either the user choice or the active descendant route", () => {
  expect(resolvePageTreeExpanded(false, false)).toBe(false);
  expect(resolvePageTreeExpanded(true, false)).toBe(true);
  expect(resolvePageTreeExpanded(false, true)).toBe(true);
});
