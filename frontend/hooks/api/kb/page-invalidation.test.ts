import { QueryClient } from "@tanstack/react-query";
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
  it("created: invalidates pagesTree, pagesRecent, kbPages and pageCollection", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "created", PAGE_ID);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTree() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesRecent() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.kbPages() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pageCollection() });
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

  it("trashed: invalidates pagesTree, pagesTrash, kbPages and page(id)", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "trashed", PAGE_ID);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTree() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTrash() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.kbPages() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(PAGE_ID) });
  });

  it("restored: invalidates pagesTree, pagesTrash, kbPages and page(id)", () => {
    const { client, invalidate } = setup();
    invalidateKbPageChange(client, "restored", PAGE_ID);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTree() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesTrash() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.kbPages() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(PAGE_ID) });
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
