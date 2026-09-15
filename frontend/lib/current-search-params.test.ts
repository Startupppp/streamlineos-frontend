import { currentSearchParams } from "./current-search-params";

it("uses the current browser URL instead of a stale render snapshot", () => {
  const stale = new URLSearchParams("q=old-search");
  window.history.replaceState(null, "", "/build/5");

  const current = currentSearchParams(stale);
  current.set("view", "list");

  expect(current.toString()).toBe("view=list");
});
