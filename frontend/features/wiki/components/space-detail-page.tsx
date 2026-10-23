"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { SpaceDetailSkeleton } from "./space-detail-skeleton";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import {
  useKbSpace,
  useArchiveKbSpace,
  useRestoreKbSpace,
} from "@/hooks/api/kb/spaces";
import {
  useKbSpaceSharingPolicy,
  useUpdateKbSpaceSharingPolicy,
} from "@/hooks/api/kb/sharing";
import { externalSharingModeContract } from "@/hooks/api/kb/kb-sharing-schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/lib/person-display";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  KbArchiveIcon,
  KbLayoutGridIcon,
  KbRotateCcwIcon,
  KbUsersIcon,
} from "@/features/wiki/lib/kb-icons";
import { KbNewMenu } from "./kb-new-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WikiPageCollectionTable, collectionCountSubtitle } from "./wiki-page-collection-table";
import { SpaceMembersSheet } from "./space-members-sheet";
import { SpaceManagerHealthSummary } from "./space-manager-health-summary";
import { SpaceArchiveImpact } from "./space-archive-impact";
import PageTree from "./page-tree";
import { SpaceBreadcrumb } from "./page-document-breadcrumb";
import type { KbAudience } from "@/types/kb";
import { KB_ACCESS_LABELS, type KbSpaceRole } from "@/types/kb";

const AUDIENCE_LABELS: Record<KbAudience, string> = {
  internal: "Internal",
  public: "Public",
  mixed: "Mixed",
};

const VIEWER_ACCESS_VIA_LABELS: Record<string, string> = {
  admin: "org admin",
  team_folder: "team folder membership",
  team_folder_admin: "team folder admin role",
  organization: "org-wide access",
};

const VIEWER_ACCESS_LEVEL_LABELS: Record<string, string> = {
  view: "Viewer",
  comment: "Commenter",
  edit: "Editor",
  manage: "Manager",
};

const AUDIENCE_BADGE_CLASS: Record<KbAudience, string> = {
  internal: "bg-muted text-muted-foreground border-border",
  public:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  mixed: "bg-primary/10 text-foreground border-primary/20",
};

const ACCESS_BADGE_CLASS: Record<KbSpaceRole, string> = {
  admin: "bg-primary/10 text-primary border-primary/30",
  publisher: "bg-primary/10 text-primary border-primary/30",
  editor: "bg-muted text-muted-foreground border-border",
  commenter: "bg-muted text-muted-foreground border-border",
  viewer: "bg-muted text-muted-foreground border-border",
};

interface SpaceDetailPageProps {
  spaceId: number;
}

export default function SpaceDetailPage({ spaceId }: SpaceDetailPageProps) {
  const {
    data: space,
    isLoading,
    isError,
    error,
    refetch,
  } = useKbSpace(spaceId);
  const canManage = useCan("kb:spaces:manage");
  const archiveSpace = useArchiveKbSpace();
  const restoreSpace = useRestoreKbSpace();
  const { data: spacePolicy } = useKbSpaceSharingPolicy(spaceId, canManage);
  const updateSharingPolicy = useUpdateKbSpaceSharingPolicy(spaceId);
  const [membersOpen, setMembersOpen] = useState(false);
  const [documentCountLabel, setDocumentCountLabel] = useState<string | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);

  const pageState = usePageState({
    permission: "kb:spaces:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && !space,
  });
  const visibleSpace = pageState.kind === "ready" ? space : undefined;
  const headerSpace = pageState.kind === "loading" ? space : visibleSpace;

  function handleRetry() {
    void refetch();
  }

  function handleMembersOpenChange(open: boolean) {
    setMembersOpen(open);
  }

  function handleCloseHierarchy() {
    setHierarchyOpen(false);
  }

  function handleOpenHierarchy() {
    setHierarchyOpen(true);
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
        toast.success(`"${space?.name ?? "Team folder"}" archived`);
        setArchiveConfirmOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleRestore() {
    restoreSpace.mutate(spaceId, {
      onSuccess: () => toast.success(`"${space?.name ?? "Team folder"}" restored`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleSharingPolicyChange(value: string) {
    const parsed = externalSharingModeContract.safeParse(value);
    if (value !== "inherit" && !parsed.success) return;
    const externalSharing = parsed.success ? parsed.data : null;
    updateSharingPolicy.mutate(
      { externalSharing },
      { onError: (err) => toast.error(getErrorMessage(err)) },
    );
  }

  const audience: KbAudience = space?.audience ?? "internal";
  const isArchived =
    space?.archivedAt !== undefined && space?.archivedAt !== null;
  const pagesOverdueForReview = space?.pagesOverdueForReview ?? 0;
  const pagesWithReviewPolicy = space?.pagesWithReviewPolicy ?? 0;

  const spaceScope = useMemo(() => ({ spaceId }), [spaceId]);

  const headerActions = visibleSpace ? (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-nowrap">
      <KbNewMenu scope={spaceScope} allowFolder={false} className="w-full min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-auto sm:basis-auto sm:flex-none" />
      {canManage && (
        <Button variant="outline" size="sm" className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none" onClick={handleOpenMembers}>
          <KbUsersIcon className="h-4 w-4 mr-1.5" />
          Members
        </Button>
      )}
      {canManage &&
        (isArchived ? (
          <Button
            size="sm"
            variant="outline"
            className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none"
            onClick={handleRestore}
            disabled={restoreSpace.isPending}
          >
            <KbRotateCcwIcon className="h-4 w-4 mr-1.5" />
            Restore
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none"
            onClick={handleOpenArchiveConfirm}
          >
            <KbArchiveIcon className="h-4 w-4 mr-1.5" />
            Archive
          </Button>
        ))}
    </div>
  ) : undefined;

  return (
    <PageWrapper
      title={headerSpace?.name ?? "Team folder"}
      subtitle={collectionCountSubtitle(headerSpace?.description, documentCountLabel)}
      leading={<SpaceBreadcrumb spaceName={headerSpace?.name ?? "Team folder"} />}
      actions={headerActions}
    >
      <PageState
        resolution={pageState}
        onRetry={handleRetry}
        loading={<SpaceDetailSkeleton />}
        notFound={
          <EmptyState
            illustration={
              <KbLayoutGridIcon className="w-8 text-muted-foreground" />
            }
            title="Team folder not found"
            description="This team folder may have been deleted or you may not have access."
            className={CONTENT_FILL_PANEL}
          />
        }
        empty={
          <EmptyState
            illustration={<KbLayoutGridIcon className="w-8 text-muted-foreground" />}
            title="Team folder unavailable"
            description="Refresh to try loading this team folder again."
            action={{ label: "Refresh", onClick: handleRetry }}
            className={CONTENT_FILL_PANEL}
          />
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
            <span className="text-3xl shrink-0">{space?.icon || "📚"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="min-w-0 break-words text-base font-semibold text-foreground">
                  {space?.name}
                </span>
                <Badge
                  variant="outline"
                  className={`text-micro h-4 px-1.5 ${AUDIENCE_BADGE_CLASS[audience]}`}
                >
                  {AUDIENCE_LABELS[audience]}
                </Badge>
                {space?.viewerSpaceRole != null && (
                  <Badge
                    variant="outline"
                    className={`text-micro h-4 px-1.5 ${ACCESS_BADGE_CLASS[space.viewerSpaceRole]}`}
                  >
                    {KB_ACCESS_LABELS[space.viewerSpaceRole]}
                  </Badge>
                )}
                {isArchived && (
                  <Badge
                    variant="outline"
                    className="text-micro h-4 px-1.5 bg-muted text-muted-foreground border-border"
                  >
                    Archived
                  </Badge>
                )}
              </div>
              {space?.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {space.description}
                </p>
              )}
              {canManage && spacePolicy !== undefined && (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="shrink-0 text-xs text-muted-foreground">External sharing:</span>
                  <div className="w-full min-w-0 sm:w-44">
                  <Select
                    value={spacePolicy.externalSharing ?? "inherit"}
                    onValueChange={handleSharingPolicyChange}
                    disabled={updateSharingPolicy.isPending}
                  >
                    <SelectTrigger className="h-7 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">
                        Inherit ({spacePolicy.effective})
                      </SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="guests">Guests only</SelectItem>
                      <SelectItem value="guests_and_links">Guests and links</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              )}
              <div
                className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap"
                suppressHydrationWarning
              >
                {space?.ownerName != null && (
                  <span>
                    Owner: {getUserDisplayName({ name: space.ownerName })}
                  </span>
                )}
                {space?.updatedAt && (
                  <span>Updated {kbTimeAgo(space.updatedAt)}</span>
                )}
                {space?.viewerAccess != null && (
                  <span>
                    Your access:{" "}
                    {VIEWER_ACCESS_LEVEL_LABELS[space.viewerAccess.level] ?? space.viewerAccess.level}
                    {" via "}
                    {VIEWER_ACCESS_VIA_LABELS[space.viewerAccess.via] ?? space.viewerAccess.via}
                  </span>
                )}
              </div>
            </div>
          </div>

          <SpaceManagerHealthSummary
            pagesWithReviewPolicy={pagesWithReviewPolicy}
            pagesOverdueForReview={pagesOverdueForReview}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full md:hidden"
            onClick={handleOpenHierarchy}
          >
            Browse hierarchy
          </Button>

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
                emptyTitle="No files in this team folder yet"
                emptyDescription="Move or create files inside this team folder to see them here."
                onDocumentCountLabelChange={setDocumentCountLabel}
              />
            </div>
          </div>
        </div>
      </PageState>

      <SpaceMembersSheet
        spaceId={spaceId}
        spaceName={visibleSpace?.name ?? ""}
        canManageFolder={visibleSpace?.viewerAccess?.level === "manage"}
        open={membersOpen && Boolean(visibleSpace)}
        onOpenChange={handleMembersOpenChange}
      />

      <Sheet open={hierarchyOpen && Boolean(visibleSpace)} onOpenChange={setHierarchyOpen}>
        <SheetContent side="left" className="gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle>Hierarchy</SheetTitle>
            <SheetDescription>Files in {visibleSpace?.name ?? "this team folder"}</SheetDescription>
          </SheetHeader>
          <SheetBody className="p-3">
            {hierarchyOpen && visibleSpace && (
              <PageTree spaceId={spaceId} onCloseMobile={handleCloseHierarchy} />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={archiveConfirmOpen && Boolean(visibleSpace)}
        onOpenChange={handleArchiveConfirmOpenChange}
        title="Archive team folder?"
        description={
          <>
            {`Archiving "${visibleSpace?.name ?? "this team folder"}" will hide it from users. Files and content are preserved and can be restored.`}
            {archiveConfirmOpen && visibleSpace && <SpaceArchiveImpact spaceId={spaceId} />}
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
