"use client";

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
} from "@/lib/knowledge-routes";
import type { KbPageListItem } from "@/hooks/api/kb/page-types";
import { KbStarIcon } from "@/features/wiki/lib/kb-icons";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  WikiPageCard,
  WIKI_PAGE_CARD_GRID_CLASS,
} from "@/features/wiki/components/wiki-page-card";

function FavoriteCard({ page }: { page: KbPageListItem }) {
  const toggleFavorite = useToggleFavoriteKbPage();

  function handleRemoveFavorite() {
    toggleFavorite.mutate(
      { pageId: page.id, isFavorite: true },
      {
        onSuccess: () => toast.success("Removed from favorites"),
        onError: () => toast.error("Failed to update favorites"),
      },
    );
  }

  return (
    <WikiPageCard
      href={pageHref(page.id)}
      title={page.title}
      icon={page.icon}
      coverImage={page.coverImage}
      subtitle={kbTimeAgo(page.updatedAt)}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={handleRemoveFavorite}
        disabled={toggleFavorite.isPending}
        aria-label="Remove from favorites"
      >
        <KbStarIcon className="h-3.5 w-3.5 fill-amber-400 text-status-warning-ink" />
      </Button>
    </WikiPageCard>
  );
}

function FavoritesSkeleton() {
  return (
    <div className={WIKI_PAGE_CARD_GRID_CLASS}>
      {Array.from({ length: 6 }).map((_, skeletonIndex) => (
        <Skeleton key={skeletonIndex} className="h-28 w-full rounded-lg" />
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
            <KbStarIcon className="w-8 text-muted-foreground" />
          }
          title="Could not load favorites"
          description="There was a problem fetching your favorited pages."
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && pages.length === 0 && (
        <EmptyState
          illustration={
            <KbStarIcon className="w-8 text-muted-foreground" />
          }
          title="No favorites yet"
          description="Star pages to pin them here for quick access."
          action={{ label: "Browse pages", href: KNOWLEDGE_BASE }}
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && pages.length > 0 && (
        <div className={WIKI_PAGE_CARD_GRID_CLASS}>
          {pages.map((page) => (
            <FavoriteCard key={page.id} page={page} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
