import { differenceInCalendarDays, parseISO } from "date-fns";
import type { StatusTone } from "@/lib/design-tokens";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";

export const RELEASE_VIEWS = ["active", "archived"] as const;
export type ReleaseView = (typeof RELEASE_VIEWS)[number];

export interface ReleaseGroups {
  upcoming: ManagedProductRelease[];
  shipped: ManagedProductRelease[];
  archived: ManagedProductRelease[];
  nextPlanned: ManagedProductRelease | null;
  total: number;
}

export interface ReleaseCountdown {
  label: string;
  tone: StatusTone;
}

function shippedSortKey(release: ManagedProductRelease): string {
  return release.releaseDate ?? release.updatedAt.slice(0, 10);
}

function compareUpcoming(a: ManagedProductRelease, b: ManagedProductRelease): number {
  if (a.releaseDate === b.releaseDate) return a.id - b.id;
  if (a.releaseDate === null) return 1;
  if (b.releaseDate === null) return -1;
  return a.releaseDate.localeCompare(b.releaseDate);
}

function compareShipped(a: ManagedProductRelease, b: ManagedProductRelease): number {
  const byDate = shippedSortKey(b).localeCompare(shippedSortKey(a));
  return byDate !== 0 ? byDate : b.id - a.id;
}

function compareArchived(a: ManagedProductRelease, b: ManagedProductRelease): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function groupReleases(rows: readonly ManagedProductRelease[], today: string): ReleaseGroups {
  const unique = Array.from(new Map(rows.map((row) => [row.id, row])).values());
  const upcoming = unique.filter((row) => row.status === "draft").sort(compareUpcoming);
  const shipped = unique.filter((row) => row.status === "released").sort(compareShipped);
  const archived = unique.filter((row) => row.status === "archived").sort(compareArchived);
  const nextPlanned =
    upcoming.find((row) => row.releaseDate !== null && row.releaseDate >= today) ?? null;
  return { upcoming, shipped, archived, nextPlanned, total: unique.length };
}

function dayCount(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

export function releaseCountdown(releaseDate: string, now: Date): ReleaseCountdown {
  const days = differenceInCalendarDays(parseISO(releaseDate), now);
  if (days === 0) return { label: "Due today", tone: "warning" };
  if (days > 0) return { label: `in ${dayCount(days)}`, tone: "info" };
  return { label: `overdue by ${dayCount(-days)}`, tone: "danger" };
}

export function releaseCountValue(count: number, hasMore: boolean): string {
  return hasMore ? `${count}+` : String(count);
}

export function releasesSubtitle(groups: ReleaseGroups, hasMore: boolean): string {
  if (groups.total === 0) return "Plan and track what ships for this product";
  const drafts = groups.upcoming.length;
  const parts = [
    `${releaseCountValue(drafts, hasMore)} ${drafts === 1 ? "draft" : "drafts"}`,
    `${releaseCountValue(groups.shipped.length, hasMore)} released`,
  ];
  if (groups.archived.length > 0) {
    parts.push(`${releaseCountValue(groups.archived.length, hasMore)} archived`);
  }
  return parts.join(" · ");
}
