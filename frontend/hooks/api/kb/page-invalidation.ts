"use client";

import type { QueryClient } from "@tanstack/react-query";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

export type KbPageChangeEvent =
  | "created"
  | "updated-listing"
  | "moved"
  | "trashed"
  | "restored"
  | "purged"
  | "acl-changed"
  | "locked"
  | "reviewed"
  | "favorited"
  | "visited";

export function invalidateKbPageChange(
  qc: QueryClient,
  event: KbPageChangeEvent,
  pageId: number,
): void {
  const k = knowledgeAndSurveysQueryKeys.kb;
  switch (event) {
    case "created":
      qc.invalidateQueries({ queryKey: k.pagesTree() });
      qc.invalidateQueries({ queryKey: k.pagesRecent() });
      qc.invalidateQueries({ queryKey: k.pageCollection() });
      break;
    case "updated-listing":
      qc.invalidateQueries({ queryKey: k.pagesTree() });
      qc.invalidateQueries({ queryKey: k.pagesRecent() });
      qc.invalidateQueries({ queryKey: k.pagesFavorites() });
      qc.invalidateQueries({ queryKey: k.pageCollection() });
      break;
    case "moved":
      qc.invalidateQueries({ queryKey: k.pagesTree() });
      qc.invalidateQueries({ queryKey: k.page(pageId) });
      qc.invalidateQueries({ queryKey: k.pageCollection() });
      qc.invalidateQueries({ queryKey: k.pagesRecent() });
      qc.invalidateQueries({ queryKey: k.pagesFavorites() });
      break;
    case "trashed":
    case "restored":
      qc.invalidateQueries({ queryKey: k.kbPages(), refetchType: "none" });
      qc.invalidateQueries({ queryKey: k.pagesTree() });
      qc.invalidateQueries({ queryKey: k.pagesTrash() });
      qc.invalidateQueries({ queryKey: k.pagesRecent() });
      qc.invalidateQueries({ queryKey: k.pagesFavorites() });
      qc.invalidateQueries({ queryKey: k.pageCollection() });
      qc.invalidateQueries({ queryKey: k.page(pageId), exact: true });
      break;
    case "purged":
      qc.invalidateQueries({ queryKey: k.pagesTrash() });
      qc.removeQueries({ queryKey: k.page(pageId), exact: true });
      break;
    case "acl-changed":
      qc.invalidateQueries({ queryKey: k.page(pageId) });
      qc.invalidateQueries({ queryKey: k.pageGrants(pageId) });
      break;
    case "locked":
      qc.invalidateQueries({ queryKey: k.page(pageId) });
      break;
    case "reviewed":
      qc.invalidateQueries({ queryKey: k.page(pageId) });
      qc.invalidateQueries({ queryKey: k.pageReviews() });
      break;
    case "favorited":
      qc.invalidateQueries({ queryKey: k.page(pageId) });
      qc.invalidateQueries({ queryKey: k.pagesFavorites() });
      break;
    case "visited":
      qc.invalidateQueries({ queryKey: k.pagesRecent() });
      break;
  }
}
