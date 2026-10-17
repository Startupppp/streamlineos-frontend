"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatRelativeTime, formatShortDate } from "@/lib/date-utils";
import {
  getUserDisplayName,
  getUserInitials,
  type NamedUser,
} from "@/lib/person-display";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { ManagedProduct } from "@/types/projects";
import { LIFECYCLE_FILTER_OPTIONS } from "./managed-products-filter-constants";
import { ManagedProductStatusBadge } from "./managed-product-status-badge";

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OwnerLookup = (ownerId: string | null) => NamedUser | null;

function isUuidLike(value: string): boolean {
  return UUID_LIKE.test(value.trim());
}

function resolveProductOwner(product: ManagedProduct, ownerOf: OwnerLookup): NamedUser | null {
  if (product.owner) {
    return {
      firstName: product.owner.firstName,
      lastName: product.owner.lastName,
      email: product.owner.email,
    };
  }
  return ownerOf(product.ownerId);
}

function sanitizeOwnerUser(user: NamedUser | null): NamedUser | null {
  if (!user) return null;
  const rawName = getUserDisplayName(user);
  if (!isUuidLike(rawName)) return user;
  const local = (user.email ?? "").trim().split("@")[0] ?? "";
  const safe = local && !isUuidLike(local) ? local : "Unknown";
  return { name: safe, firstName: null, lastName: null, email: user.email };
}

export function productOwnerForDisplay(
  product: ManagedProduct,
  ownerOf: OwnerLookup,
): { user: NamedUser | null; avatarUrl: string | null } {
  return {
    user: sanitizeOwnerUser(resolveProductOwner(product, ownerOf)),
    avatarUrl: product.owner?.image ?? null,
  };
}

function ownerDisplayName(user: NamedUser | null): string {
  if (!user) return "Unassigned";
  return getUserDisplayName(sanitizeOwnerUser(user));
}

function lifecycleLabel(lifecycle: string | undefined): string {
  if (!lifecycle) return "";
  return (
    LIFECYCLE_FILTER_OPTIONS.find((option) => option.value === lifecycle)?.label ??
    lifecycle.replaceAll("_", " ")
  );
}

function feedbackTone(last30d: number, previous30d: number): string {
  if (last30d > previous30d) return "text-status-success-ink-strong";
  if (last30d < previous30d) return "text-status-danger-ink-strong";
  return "text-muted-foreground";
}

function feedbackTitle(last30d: number, previous30d: number): string {
  if (last30d > previous30d) {
    return `${last30d} in the last 30 days, up from ${previous30d}`;
  }
  if (last30d < previous30d) {
    return `${last30d} in the last 30 days, down from ${previous30d}`;
  }
  return `${last30d} in the last 30 days, unchanged`;
}

export function ProductNameCell({ product }: { product: ManagedProduct }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-micro font-medium tracking-tight text-primary"
        aria-hidden="true"
      >
        {product.key.slice(0, 2).toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <Link href={`/build/managed-products/${product.id}`} className="min-w-0">
            <TruncatedText
              text={product.name}
              className="text-label font-medium text-foreground transition-colors hover:text-primary"
            />
          </Link>
          {product.status === "archived" ? (
            <ManagedProductStatusBadge status="archived" />
          ) : null}
        </span>
        <span className={cn("font-mono text-micro text-muted-foreground", TEXT_ONE_LINE)}>
          {product.key}
        </span>
      </span>
    </span>
  );
}

export function ProductLifecycleCell({ product }: { product: ManagedProduct }) {
  const label = lifecycleLabel(product.lifecycle);
  if (!label) return null;
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {label}
    </Badge>
  );
}

export function ProductOwnerCell({
  product,
  ownerOf,
}: {
  product: ManagedProduct;
  ownerOf: OwnerLookup;
}) {
  const { user, avatarUrl } = productOwnerForDisplay(product, ownerOf);
  const label = ownerDisplayName(user);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Avatar className="h-5 w-5 shrink-0">
        {avatarUrl ? <AvatarImage src={resolveImageUrl(avatarUrl)} alt="" /> : null}
        <AvatarFallback className="text-micro">{getUserInitials(user)}</AvatarFallback>
      </Avatar>
      <TruncatedText text={label} className="min-w-0 text-label text-muted-foreground" />
    </span>
  );
}

export function ProductProjectsCell({ product }: { product: ManagedProduct }) {
  if (product.linkedProjectCount === undefined) return null;
  return (
    <span className="font-mono text-label tabular-nums text-muted-foreground">
      {product.linkedProjectCount}
    </span>
  );
}

export function ProductReleaseCell({ product }: { product: ManagedProduct }) {
  if (!product.nextRelease) return null;
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <TruncatedText text={product.nextRelease.name} className="text-label text-foreground" />
      {product.nextRelease.version ? (
        <span className="font-mono text-micro text-muted-foreground">
          {product.nextRelease.version}
        </span>
      ) : null}
    </span>
  );
}

export function ProductFeedbackCell({ product }: { product: ManagedProduct }) {
  const trend = product.feedbackTrend;
  if (!trend) return null;
  const Icon =
    trend.last30d > trend.previous30d
      ? ArrowUp
      : trend.last30d < trend.previous30d
        ? ArrowDown
        : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-label tabular-nums",
        feedbackTone(trend.last30d, trend.previous30d),
      )}
      title={feedbackTitle(trend.last30d, trend.previous30d)}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {trend.last30d}
    </span>
  );
}

export function ProductUpdatedCell({ product }: { product: ManagedProduct }) {
  const relative = formatRelativeTime(product.updatedAt);
  const exact = formatShortDate(product.updatedAt);
  if (!relative && !exact) return null;
  return (
    <time
      dateTime={product.updatedAt}
      title={exact || undefined}
      className="text-label tabular-nums text-muted-foreground"
    >
      {relative || exact}
    </time>
  );
}

export function ProductGoalHealthCell({ product }: { product: ManagedProduct }) {
  const h = product.goalHealth;
  if (!h || h.total === 0) return null;
  const allOnTrack = h.onTrack === h.total;
  const hasOffTrack = h.offTrack > 0;
  return (
    <span
      className={cn(
        "font-mono text-label tabular-nums",
        allOnTrack
          ? "text-status-success-ink-strong"
          : hasOffTrack
            ? "text-status-danger-ink-strong"
            : h.atRisk > 0
              ? "text-status-warning-ink-strong"
              : "text-muted-foreground",
      )}
      title={`Goals: ${h.onTrack} on track, ${h.atRisk} at risk, ${h.offTrack} off track`}
    >
      {h.onTrack}/{h.total}
    </span>
  );
}

export function ProductMobileSignals({ product }: { product: ManagedProduct }) {
  const lifecycle = lifecycleLabel(product.lifecycle);
  const count = product.linkedProjectCount;
  const release = product.nextRelease?.name;
  const updated = formatRelativeTime(product.updatedAt);
  const freshness = product.sourceFreshness ? formatRelativeTime(product.sourceFreshness) : null;
  const primary = [
    lifecycle,
    count === undefined ? "" : `${count} ${count === 1 ? "project" : "projects"}`,
    release ?? "",
  ].filter(Boolean);

  if (primary.length === 0 && !product.feedbackTrend && !product.goalHealth && !updated) return null;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {primary.length > 0 ? (
        <p className={cn("text-label text-muted-foreground", TEXT_ONE_LINE)}>
          {primary.join(" · ")}
        </p>
      ) : null}
      <div className="flex min-w-0 items-center gap-2">
        {product.goalHealth && product.goalHealth.total > 0 ? (
          <ProductGoalHealthCell product={product} />
        ) : null}
        {product.feedbackTrend ? <ProductFeedbackCell product={product} /> : null}
        {freshness ? (
          <span className="text-label text-muted-foreground" title="Last feedback received">
            {freshness}
          </span>
        ) : null}
        {updated ? (
          <time dateTime={product.updatedAt} className="text-label text-muted-foreground">
            {updated}
          </time>
        ) : null}
      </div>
    </div>
  );
}
