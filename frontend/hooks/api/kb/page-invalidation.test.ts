import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { knowledgeAndSurveysQueryKeys as qk } from "@/lib/query-keys/knowledge-and-surveys";
import { invalidateKbPageChange, type KbPageChangeEvent } from "./page-invalidation";

function setup() {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const remove = jest.spyOn(client, "removeQueries");
  return { client, invalidate, remove };
}

const PAGE_ID = 42;

describe("KB-B-033 invalidateKbPageChange — event→keys table (FE-19, FE-34)", () => {
  it("created: refreshes the listings a new page joins and never refetches every open page", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "created", PAGE_ID);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTree() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesRecent() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pageCollection() });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: qk.kb.kbPages() });
  });

  it("updated-listing: invalidates pagesTree, pagesRecent, pagesFavorites and pageCollection", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "updated-listing", PAGE_ID);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTree() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesRecent() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesFavorites() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pageCollection() });
  });

  it("moved: invalidates pagesTree, page(id), pageCollection, pagesRecent and pagesFavorites", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "moved", PAGE_ID);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTree() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(PAGE_ID) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pageCollection() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesRecent() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesFavorites() });
  });

  it.each(["trashed", "restored"] as const)(
    "%s: refetches only the affected listings and that page, and marks the rest of the subtree stale without refetching it",
    (event) => {
      const { client, invalidate } = setup();
      invalidateKbPageChange(client, event, PAGE_ID);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.kbPages(), refetchType: "none" });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTree() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTrash() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesRecent() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesFavorites() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pageCollection() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(PAGE_ID), exact: true });
      expect(invalidate).not.toHaveBeenCalledWith({ queryKey: qk.kb.kbPages() });
    },
  );

  it("trashed: a sibling page detail that is open is marked stale but not refetched", async () => {
    const client = new QueryClient();
    const sibling = qk.kb.page(PAGE_ID + 1);
    const queryFn = jest.fn().mockResolvedValue({ id: PAGE_ID + 1 });
    await client.fetchQuery({ queryKey: sibling, queryFn, staleTime: Infinity });
    const observer = new QueryObserver(client, { queryKey: sibling, queryFn, staleTime: Infinity });
    const unsubscribe = observer.subscribe(() => undefined);
    invalidateKbPageChange(client, "trashed", PAGE_ID);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.getQueryState(sibling)?.isInvalidated).toBe(true);
    expect(queryFn).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("CONTROL: trashed refetches the open detail of the trashed page itself", async () => {
    const client = new QueryClient();
    const own = qk.kb.page(PAGE_ID);
    const queryFn = jest.fn().mockResolvedValue({ id: PAGE_ID });
    await client.fetchQuery({ queryKey: own, queryFn, staleTime: Infinity });
    const observer = new QueryObserver(client, { queryKey: own, queryFn, staleTime: Infinity });
    const unsubscribe = observer.subscribe(() => undefined);
    invalidateKbPageChange(client, "trashed", PAGE_ID);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(queryFn).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("purged: invalidates pagesTrash and removes page(id) from cache", () => {
    const { client, invalidate, remove } = setup();
    invalidateKbPageChange(client, "purged", PAGE_ID);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTrash() });
    expect(remove).toHaveBeenCalledWith({ queryKey: qk.kb.page(PAGE_ID), exact: true });
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: qk.kb.page(PAGE_ID) }));
  });

  it("acl-changed: invalidates page(id) and pageGrants(id)", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "acl-changed", PAGE_ID);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(PAGE_ID) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pageGrants(PAGE_ID) });
  });

  it("locked: invalidates only page(id)", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "locked", PAGE_ID);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(PAGE_ID) });
  });

  it("reviewed: invalidates page(id) and pageReviews", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "reviewed", PAGE_ID);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(PAGE_ID) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pageReviews() });
  });

  it("favorited: invalidates page(id) and pagesFavorites", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "favorited", PAGE_ID);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(PAGE_ID) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesFavorites() });
  });

  it("visited: invalidates only pagesRecent", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "visited", PAGE_ID);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesRecent() });
  });

  it.each<KbPageChangeEvent>([
    "created", "updated-listing", "moved", "trashed", "restored",
    "purged", "acl-changed", "locked", "reviewed", "favorited", "visited",
  ])("%s: does not throw when called with a valid pageId", (event) => {
    const { client } = setup();
    expect(() => invalidateKbPageChange(client, event, PAGE_ID)).not.toThrow();
  });
});
