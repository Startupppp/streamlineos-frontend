"use client";

import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbPagesFavorites, useToggleFavoriteKbPage } from "@/hooks/api/kb";
import {
  pageHref,
  KNOWLEDGE_BASE,
} from "@/features/wiki/lib/knowledge-routes";
import type { KbPageListItem } from "@/hooks/api/kb/pages";
import {
  KbFileTextIcon,
  KbStarIcon,
} from "@/features/wiki/lib/kb-icons";
import { TruncatedText } from "@/components/ui/truncated-text";

function FavoriteRow({ page }: { page: KbPageListItem }) {
  const toggleFavorite = useToggleFavoriteKbPage();

  function handleRemoveFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate(
      { pageId: page.id, isFavorite: true },
      {
        onSuccess: () => toast.success("Removed from favorites"),
        onError: () => toast.error("Failed to update favorites"),
      },
    );
  }

  return (
    <Link
      href={pageHref(page.id)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
    >
      <span className="text-base shrink-0 w-5 text-center">
        {page.icon ?? (
          <KbFileTextIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </span>
      <TruncatedText text={page.title || "Untitled"} className="flex-1 text-sm font-medium" />
      <Button
        variant="ghost"
        size="icon"
        className="w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleRemoveFavorite}
        disabled={toggleFavorite.isPending}
        aria-label="Remove from favorites"
      >
        <KbStarIcon className="h-3.5 w-3.5 fill-amber-400 text-status-warning-ink" />
      </Button>
    </Link>
  );
}

function FavoritesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  const { data: pages = [], isLoading, isError } = useKbPagesFavorites();

  return (
    <PageWrapper title="Favorites" subtitle="Pages you have starred">
      {isLoading && <FavoritesSkeleton />}

      {!isLoading && isError && (
        <EmptyState
          illustration={
            <KbStarIcon className="w-8 text-muted-foreground/40" />
          }
          title="Could not load favorites"
          description="There was a problem fetching your favorited pages."
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && pages.length === 0 && (
        <EmptyState
          illustration={
            <KbStarIcon className="w-8 text-muted-foreground/40" />
          }
          title="No favorites yet"
          description="Star pages to pin them here for quick access."
          action={{ label: "Browse pages", href: KNOWLEDGE_BASE }}
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && pages.length > 0 && (
        <div className="space-y-1.5">
          {pages.map((page) => (
            <FavoriteRow key={page.id} page={page} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
