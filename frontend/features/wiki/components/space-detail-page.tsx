"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useCreateKbPage } from "@/hooks/api/kb";
import {
  useKbSpace,
  useArchiveKbSpace,
  useRestoreKbSpace,
} from "@/hooks/api/kb/spaces";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { KB_SPACES, pageHref } from "@/lib/knowledge-routes";
import {
  KbArchiveIcon,
  KbLayoutGridIcon,
  KbPlusIcon,
  KbRotateCcwIcon,
  KbTriangleAlertIcon,
  KbUsersIcon,
} from "@/features/wiki/lib/kb-icons";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";
import { SpaceMembersSheet } from "./space-members-sheet";
import { SpaceArchiveImpact } from "./space-archive-impact";
import PageTree from "./page-tree";
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
  const router = useRouter();
  const { data: space, isLoading, isError, error, refetch } = useKbSpace(spaceId);
  const canCreatePage = useCan("kb:pages:create");
  const canManage = useCan("kb:spaces:manage");
  const createPage = useCreateKbPage();
  const archiveSpace = useArchiveKbSpace();
  const restoreSpace = useRestoreKbSpace();
  const [membersOpen, setMembersOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const isNotFound = isApiError(error) && error.status === 404;

  const pageState = usePageState({
    permission: "kb:spaces:view",
    isLoading,
    isError: isError && !isNotFound,
    error: isNotFound ? null : error,
    isEmpty: !isLoading && (isNotFound || (!isError && !space)),
  });

  function handleRetry() {
    void refetch();
  }

  function handleNewPage() {
    createPage.mutate(
      { spaceId },
      {
        onSuccess: (page) => router.push(pageHref(page.id)),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleMembersOpenChange(open: boolean) {
    setMembersOpen(open);
  }

  function handleOpenMembers() {
    setMembersOpen(true);
  }

  function handleOpenArchiveConfirm() {
    setArchiveConfirmOpen(true);
  }

  function handleArchiveConfirmOpenChange(open: boolean) {
    setArchiveConfirmOpen(open);
  }

  function handleConfirmArchive() {
    archiveSpace.mutate(spaceId, {
      onSuccess: () => {
        toast.success(`"${space?.name ?? "Space"}" archived`);
        setArchiveConfirmOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleRestore() {
    restoreSpace.mutate(spaceId, {
      onSuccess: () => toast.success(`"${space?.name ?? "Space"}" restored`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  const audience: KbAudience = space?.audience ?? "internal";
  const isArchived = space?.archivedAt !== undefined && space?.archivedAt !== null;
  const pagesOverdueForReview = space?.pagesOverdueForReview ?? 0;
  const pagesWithReviewPolicy = space?.pagesWithReviewPolicy ?? 0;

  const headerActions = space ? (
    <div className="flex items-center gap-1.5">
      {canCreatePage && (
        <Button size="sm" onClick={handleNewPage} disabled={createPage.isPending}>
          <KbPlusIcon className="h-4 w-4 mr-1.5" />
          New page
        </Button>
      )}
      {canManage && (
        <Button variant="outline" size="sm" onClick={handleOpenMembers}>
          <KbUsersIcon className="h-4 w-4 mr-1.5" />
          Members
        </Button>
      )}
      {canManage &&
        (isArchived ? (
          <Button variant="outline" size="sm" onClick={handleRestore} disabled={restoreSpace.isPending}>
            <KbRotateCcwIcon className="h-4 w-4 mr-1.5" />
            Restore
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleOpenArchiveConfirm}>
            <KbArchiveIcon className="h-4 w-4 mr-1.5" />
            Archive
          </Button>
        ))}
    </div>
  ) : undefined;

  return (
    <PageWrapper
      title={space?.name ?? "Space"}
      subtitle={space?.description ?? undefined}
      backHref={KB_SPACES}
      actions={headerActions}
    >
      <PageState
        resolution={pageState}
        onRetry={handleRetry}
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
                {isArchived && (
                  <Badge variant="outline" className="text-micro h-4 px-1.5 bg-muted text-muted-foreground border-border">
                    Archived
                  </Badge>
                )}
              </div>
              {space?.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {space.description}
                </p>
              )}
              {canManage && pagesWithReviewPolicy > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground" suppressHydrationWarning>
                  {pagesOverdueForReview > 0 && (
                    <KbTriangleAlertIcon className="h-3.5 w-3.5 text-status-warning-ink-strong" />
                  )}
                  <span>
                    {pagesWithReviewPolicy} {pagesWithReviewPolicy === 1 ? "page" : "pages"} under review
                    policy
                    {pagesOverdueForReview > 0
                      ? ` · ${pagesOverdueForReview} overdue`
                      : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-4">
            <div className="hidden w-56 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card/50 p-2 md:flex">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Hierarchy
              </p>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PageTree spaceId={spaceId} />
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <WikiPageCollectionTable
                fixedParams={{ spaceId }}
                emptyTitle="No pages in this space yet"
                emptyDescription="Move or create pages inside this space to see them here."
              />
            </div>
          </div>
        </div>
      </PageState>

      <SpaceMembersSheet
        spaceId={spaceId}
        spaceName={space?.name ?? ""}
        open={membersOpen}
        onOpenChange={handleMembersOpenChange}
      />

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={handleArchiveConfirmOpenChange}
        title="Archive space?"
        description={
          <>
            {`Archiving "${space?.name ?? "this space"}" will hide it from users. Pages and content are preserved and can be restored.`}
            {archiveConfirmOpen && <SpaceArchiveImpact spaceId={spaceId} />}
          </>
        }
        confirmLabel="Archive"
        destructive
        isPending={archiveSpace.isPending}
        onConfirm={handleConfirmArchive}
      />
    </PageWrapper>
  );
}
