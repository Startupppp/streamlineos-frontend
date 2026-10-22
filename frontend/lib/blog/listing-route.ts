import "server-only";
import { notFound, permanentRedirect } from "next/navigation";
import type { BlogPostPage } from "./contracts";

export const LISTING_PAGE_SIZE = 12;

export function listingPageNumber(segments: string[] | undefined, basePath: string): number {
  const page = pageFromSegments(segments);
  if (page === null) notFound();
  if (page === "redirect-root") permanentRedirect(basePath);
  return page;
}

export function assertPageExists(page: BlogPostPage): void {
  if (page.page > 1 && page.page > page.totalPages) notFound();
}

export function pagedPath(basePath: string, page: number): string {
  return page === 1 ? basePath : `${basePath}/page/${page}`;
}

function pageFromSegments(segments: string[] | undefined): number | "redirect-root" | null {
  if (!segments || segments.length === 0) return 1;
  if (segments.length !== 2 || segments[0] !== "page" || !/^[1-9]\d{0,4}$/.test(segments[1] ?? "")) return null;
  const n = Number(segments[1]);
  return n === 1 ? "redirect-root" : n;
}
