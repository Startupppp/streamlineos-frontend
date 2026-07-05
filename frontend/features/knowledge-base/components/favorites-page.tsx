"use client";

import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbPagesFavorites, useToggleFavoriteKbPage } from "@/hooks/api/kb";
import { pageHref, KNOWLEDGE_BASE } from "@/features/knowledge-base/lib/knowledge-routes";
import type { KbPage } from "@/hooks/api/kb/pages";
import { KbFileTextIcon, KbStarIcon } from "@/features/knowledge-base/lib/kb-icons";

function FavoriteRow({ page }: { page: KbPage }) {
  const toggleFavorite = useToggleFavoriteKbPage();

  function handleRemoveFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate(
      { pageId: page.id, isFavorite: true },
      {
        onSuccess: () => toast.success("Removed from favorites"),
        onError: () => toast.error("Failed to update favorites"),
      }
    );
  }

  return (
    <Link
      href={pageHref(page.id)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
    >
      <span className="text-base shrink-0 w-5 text-center">
        {page.icon ?? <KbFileTextIcon className="h-4 w-4 text-muted-foreground" />}
      </span>
      <span className="flex-1 text-sm truncate font-medium">{page.title || "Untitled"}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleRemoveFavorite}
        disabled={toggleFavorite.isPending}
        aria-label="Remove from favorites"
      >
        <KbStarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
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

  const subtitle = pages.length > 0 ? `${pages.length} page${pages.length === 1 ? "" : "s"}` : undefined;

  return (
    <PageWrapper title="Favorites" subtitle={subtitle}>
      {isLoading && <FavoritesSkeleton />}

      {!isLoading && isError && (
        <EmptyState
          illustration={<KbStarIcon className="h-8 w-8 text-muted-foreground/40" />}
          title="Could not load favorites"
          description="There was a problem fetching your favorited pages."
        />
      )}

      {!isLoading && !isError && pages.length === 0 && (
        <EmptyState
          illustration={<KbStarIcon className="h-8 w-8 text-muted-foreground/40" />}
          title="No favorites yet"
          description="Star pages to pin them here for quick access."
          action={{ label: "Browse pages", href: KNOWLEDGE_BASE }}
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
