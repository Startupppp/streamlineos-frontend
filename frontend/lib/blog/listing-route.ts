import "server-only";
import { notFound, permanentRedirect } from "next/navigation";
import type { BlogPostPage } from "./contracts";

export const LISTING_PAGE_SIZE = 12;

/** Resolves the `page/<n>` tail: `/page/1` redirects to the root, malformed tails 404. */
export function listingPageNumber(segments: string[] | undefined, basePath: string): number {
  const page = pageFromSegments(segments);
  if (page === null) notFound();
  if (page === "redirect-root") permanentRedirect(basePath);
  return page;
}

/** A page past the end is a real 404, never an empty indexable page. */
export function assertPageExists(page: BlogPostPage): void {
  if (page.page > 1 && page.page > page.totalPages) notFound();
}

export function pagedPath(basePath: string, page: number): string {
  return page === 1 ? basePath : `${basePath}/page/${page}`;
}

/** Parses an optional `page/<n>` tail. `undefined` → page 1; anything malformed → null (404). */
function pageFromSegments(segments: string[] | undefined): number | "redirect-root" | null {
  if (!segments || segments.length === 0) return 1;
  if (segments.length !== 2 || segments[0] !== "page" || !/^[1-9]\d{0,4}$/.test(segments[1] ?? "")) return null;
  const n = Number(segments[1]);
  return n === 1 ? "redirect-root" : n;
}
