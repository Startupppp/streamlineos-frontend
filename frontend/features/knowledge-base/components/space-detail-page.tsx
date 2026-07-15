"use client";

import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbSpace } from "@/hooks/api/kb/spaces";
import { useKbPagesTree } from "@/hooks/api/kb/pages";
import { KB_SPACES } from "@/features/knowledge-base/lib/knowledge-routes";
import { filterTreeWithAncestors } from "@/features/knowledge-base/lib/tree-utils";
import { KbLayoutGridIcon } from "@/features/knowledge-base/lib/kb-icons";
import PageTree from "./page-tree";
import type { KbAudience } from "@/types/kb";

const AUDIENCE_LABELS: Record<KbAudience, string> = {
  internal: "Internal",
  public: "Public",
  mixed: "Mixed",
};

const AUDIENCE_BADGE_CLASS: Record<KbAudience, string> = {
  internal: "bg-muted text-muted-foreground border-border",
  public: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  mixed: "bg-primary/10 text-foreground border-primary/20",
};

interface SpaceDetailPageProps {
  spaceId: number;
}

export default function SpaceDetailPage({ spaceId }: SpaceDetailPageProps) {
  const { data: space, isLoading, isError } = useKbSpace(spaceId);
  const { data: treeNodes = [], isLoading: treeLoading } = useKbPagesTree();

  if (isLoading) {
    return (
      <PageWrapper title="Loading..." backHref={KB_SPACES}>
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (isError || !space) {
    return (
      <PageWrapper title="Space" backHref={KB_SPACES}>
        <EmptyState
          illustration={
            <KbLayoutGridIcon className="w-8 text-muted-foreground/40" />
          }
          title="Could not load space"
          description="There was a problem fetching this space."
          className={CONTENT_FILL_PANEL}
        />
      </PageWrapper>
    );
  }

  const audience = (space.audience ?? "internal") as KbAudience;

  const spacePageNodes = treeNodes.filter((n) => n.spaceId === spaceId);
  const filteredNodes =
    spacePageNodes.length > 0
      ? filterTreeWithAncestors(treeNodes, (n) => n.spaceId === spaceId)
      : [];

  return (
    <PageWrapper
      title={space.name}
      subtitle={space.description ?? undefined}
      backHref={KB_SPACES}
    >
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
          <span className="text-3xl shrink-0">{space.icon ?? "📚"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold text-foreground">
                {space.name}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] h-4 px-1.5 ${AUDIENCE_BADGE_CLASS[audience]}`}
              >
                {AUDIENCE_LABELS[audience]}
              </Badge>
            </div>
            {space.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {space.description}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">
              Pages
              {!treeLoading && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({spacePageNodes.length})
                </span>
              )}
            </p>
          </div>
          {spacePageNodes.length === 0 && !treeLoading ? (
            <EmptyState
              illustration={
                <KbLayoutGridIcon className="w-8 text-muted-foreground/40" />
              }
              title="No pages in this space yet"
              description="Assign pages from Page settings"
              className={CONTENT_FILL_PANEL}
            />
          ) : (
            <div className="bg-card border border-border rounded-xl p-2">
              <PageTree nodes={filteredNodes} isLoading={treeLoading} />
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
