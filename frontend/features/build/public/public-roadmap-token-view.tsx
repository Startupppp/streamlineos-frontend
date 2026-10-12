"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowBigUp, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/loading-state";
import { isApiError } from "@/lib/api-envelope";
import { usePublicRoadmapByToken } from "@/hooks/api/build/roadmap-public";
import type { PublicRoadmapItem } from "@/types/projects";

const HORIZON_COLUMNS: { key: "now" | "next" | "later"; label: string }[] = [
  { key: "now", label: "Now" },
  { key: "next", label: "Next" },
  { key: "later", label: "Later" },
];

function RoadmapCard({ item }: { item: PublicRoadmapItem }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center justify-center rounded-md border px-2 py-1 shrink-0">
            <ArrowBigUp className="h-4 w-4" aria-hidden />
            <span className="text-sm font-semibold tabular-nums">{item.votes}</span>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium leading-snug">{item.title}</p>
            {item.description ? (
              <p className="text-xs text-muted-foreground line-clamp-3">{item.description}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              {item.targetQuarter ? (
                <Badge variant="outline" className="text-micro">{item.targetQuarter}</Badge>
              ) : null}
              {item.category ? (
                <Badge variant="secondary" className="text-micro">{item.category}</Badge>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotFoundView() {
  return (
    <div className="flex min-h-dvh items-center justify-center surface-soft">
      <div className="text-center space-y-3 px-4">
        <p className="text-2xl font-bold text-foreground">Roadmap not found</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          This roadmap link is invalid or has been revoked. Please check the link and try again.
        </p>
      </div>
    </div>
  );
}

export function PublicRoadmapTokenView() {
  const shareToken = useSearchParams().get("shareToken") ?? "";
  const { data, isLoading, isError, error } = usePublicRoadmapByToken(shareToken);

  const grouped = useMemo(() => {
    if (!data) return null;
    const all: PublicRoadmapItem[] = [
      ...(data.roadmap.planned ?? []),
      ...(data.roadmap.in_progress ?? []),
      ...(data.roadmap.completed ?? []),
    ];
    const map: Record<"now" | "next" | "later", PublicRoadmapItem[]> = {
      now: [],
      next: [],
      later: [],
    };
    for (const item of all) {
      const h = item.horizon ?? "later";
      map[h].push(item);
    }
    return map;
  }, [data]);

  if (!shareToken) return <NotFoundView />;
  if (isLoading) return <LoadingState variant="cards" rows={9} />;
  if (isError) {
    if (isApiError(error) && (error.status === 404 || error.status === 410)) {
      return <NotFoundView />;
    }
    return (
      <div className="flex min-h-dvh items-center justify-center surface-soft">
        <div className="text-center space-y-3 px-4">
          <p className="text-2xl font-bold text-foreground">Roadmap unavailable</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            This roadmap could not be loaded. Please try again later.
          </p>
        </div>
      </div>
    );
  }
  if (!data || !grouped) return <NotFoundView />;

  const hasItems = HORIZON_COLUMNS.some((col) => (grouped[col.key]?.length ?? 0) > 0);

  return (
    <main className="min-h-dvh surface-soft">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">Product Roadmap</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {data.orgName ?? "Roadmap"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            See what we&apos;re building and coming up next.
          </p>
        </header>

        {!hasItems ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No roadmap items to show yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {HORIZON_COLUMNS.map((col) => {
              const items = grouped[col.key] ?? [];
              return (
                <section key={col.key}>
                  <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {col.label}
                  </h2>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nothing here yet</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {items.map((item) => (
                        <RoadmapCard key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
