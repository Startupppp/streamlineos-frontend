"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useKbSpace } from "@/hooks/api/kb/spaces";
import { KB_SPACES } from "@/lib/knowledge-routes";
import { KbLayoutGridIcon } from "@/features/wiki/lib/kb-icons";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";
import type { KbAudience } from "@/types/kb";

const AUDIENCE_LABELS: Record<KbAudience, string> = {
  internal: "Internal",
  public: "Public",
  mixed: "Mixed",
};

const AUDIENCE_BADGE_CLASS: Record<KbAudience, string> = {
  internal: "bg-muted text-muted-foreground border-border",
  public:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  mixed: "bg-primary/10 text-foreground border-primary/20",
};

interface SpaceDetailPageProps {
  spaceId: number;
}

export default function SpaceDetailPage({ spaceId }: SpaceDetailPageProps) {
  const { data: space, isLoading, isError, error } = useKbSpace(spaceId);

  const pageState = usePageState({
    permission: "kb:spaces:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && !space,
  });

  const audience: KbAudience = space?.audience ?? "internal";

  return (
    <PageWrapper
      title={space?.name ?? "Space"}
      subtitle={space?.description ?? undefined}
      backHref={KB_SPACES}
    >
      <PageState
        resolution={pageState}
        loading={
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
        empty={
          <EmptyState
            illustration={
              <KbLayoutGridIcon className="w-8 text-muted-foreground" />
            }
            title="Space not found"
            description="This space may have been deleted or you may not have access."
            className={CONTENT_FILL_PANEL}
          />
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
            <span className="text-3xl shrink-0">{space?.icon ?? "📚"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold text-foreground">
                  {space?.name}
                </span>
                <Badge
                  variant="outline"
                  className={`text-micro h-4 px-1.5 ${AUDIENCE_BADGE_CLASS[audience]}`}
                >
                  {AUDIENCE_LABELS[audience]}
                </Badge>
              </div>
              {space?.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {space.description}
                </p>
              )}
            </div>
          </div>

          <WikiPageCollectionTable
            fixedParams={{ spaceId }}
            emptyTitle="No pages in this space yet"
            emptyDescription="Move or create pages inside this space to see them here."
          />
        </div>
      </PageState>
    </PageWrapper>
  );
}
