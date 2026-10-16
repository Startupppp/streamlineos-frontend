"use client";

import { useState } from "react";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-envelope";
import { kbPageEditConflictContract } from "@/features/wiki/lib/wiki-schema";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCan } from "@/hooks/api/access";
import { useKbSpaces } from "@/hooks/api/kb/spaces";
import {
  useKbPage,
  useUpdateKbPage,
  usePublishKbPage,
  useArchiveKbPage,
  useUnarchiveKbPage,
  useVerifyKbPage,
  useMarkStaleKbPage,
} from "@/hooks/api/kb/pages";
import { PageRecordLinks } from "./page-record-links";
import { RequestReviewDialog } from "./reviews-decision-dialogs";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

const STATUS_OPTIONS: Array<{ value: "draft" | "in_review" | "published" | "archived"; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const FIELD_CLASS = "h-9 w-full text-label bg-card border-input shadow-xs";
const ACTION_BTN_BASE = "h-9 w-full text-label";
const ACTION_BTN_NEUTRAL = `${ACTION_BTN_BASE} bg-card border border-input shadow-xs hover:bg-muted/50`;
const ACTION_BTN_DANGER = `${ACTION_BTN_BASE} text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive`;
const ACTION_BTN_WARNING = `${ACTION_BTN_BASE} text-status-warning-ink border-status-warning-rule hover:bg-status-warning-surface hover:text-status-warning-ink`;

const CONTENT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "note", label: "Note" },
  { value: "sop", label: "SOP" },
  { value: "policy", label: "Policy" },
  { value: "support_article", label: "Support Article" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "decision_record", label: "Decision Record" },
  { value: "meeting_notes", label: "Meeting Notes" },
  { value: "runbook", label: "Runbook" },
  { value: "project_brief", label: "Project Brief" },
  { value: "playbook", label: "Playbook" },
];

interface PageMetadataSheetProps {
  page: KbPageDetail;
  pageId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScopeChange =
  | { field: "spaceId"; value: number | null }
  | { field: "ownerUserId"; value: string | null };

export default function PageMetadataSheet({
  page,
  pageId,
  open,
  onOpenChange,
}: PageMetadataSheetProps) {
  const canUpdate = useCan("kb:pages:update");
  const canManage = useCan("kb:pages:manage");
  const canManageReviews = useCan("kb:reviews:manage");
  const isEditable = canUpdate && page.canEdit === true && (!page.isLocked || canManage);
  const canChangeOwner = isEditable && canManage;
  const [intervalDays, setIntervalDays] = useState<string>("");
  const [verifyFormOpen, setVerifyFormOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [pendingScope, setPendingScope] = useState<(ScopeChange & { pageId: number; minimumRevision: number | null }) | null>(null);
  const [isRetryingScope, setIsRetryingScope] = useState(false);

  const { refetch } = useKbPage(pageId);
  const updatePage = useUpdateKbPage();
  const publishPage = usePublishKbPage();
  const archivePage = useArchiveKbPage();
  const unarchivePage = useUnarchiveKbPage();
  const verifyPage = useVerifyKbPage();
  const markStalePage = useMarkStaleKbPage();

  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data ?? [];

  function changeScope(change: ScopeChange) {
    if (!isEditable || (change.field === "ownerUserId" && !canChangeOwner)) return;
    updatePage.mutate(
      { pageId, [change.field]: change.value, expectedContentRevision: page.contentRevision },
      {
        onSuccess: () => {
          setPendingScope((pending) => pending?.pageId === pageId && pending.field === change.field ? null : pending);
          toast.success(`${change.field === "spaceId" ? "Space" : "Owner"} updated`);
        },
        onError: (error) => {
          if (isApiError(error) && error.status === 409) {
            const details = kbPageEditConflictContract.safeParse(error.details);
            setPendingScope({ ...change, pageId, minimumRevision: details.success ? details.data.currentContentRevision : null });
            toast.error("Page changed before this setting was saved");
            return;
          }
          toast.error(`Failed to update ${change.field === "spaceId" ? "space" : "owner"}`);
        },
      },
    );
  }

  function handleSpaceChange(value: string) {
    changeScope({ field: "spaceId", value: value === "none" ? null : Number(value) });
  }

  function handleStatusChange(value: string) {
    if (!isEditable) return;
    updatePage.mutate(
      { pageId, status: value as "draft" | "in_review" | "published" | "archived", expectedContentRevision: page.contentRevision },
      { onError: () => toast.error("Failed to update status") }
    );
  }

  function handleContentTypeChange(value: string) {
    if (!isEditable) return;
    updatePage.mutate(
      { pageId, contentType: value, expectedContentRevision: page.contentRevision },
      { onError: () => toast.error("Failed to update content type") }
    );
  }

  function handleOwnerChange(value: string) {
    changeScope({ field: "ownerUserId", value: value || null });
  }

  async function retryScopeChange() {
    const pending = pendingScope?.pageId === pageId ? pendingScope : null;
    if (!pending || isRetryingScope || !isEditable || (pending.field === "ownerUserId" && !canChangeOwner)) return;
    setIsRetryingScope(true);
    try {
      const latest = await refetch();
      if (!latest.isSuccess || !latest.data || latest.data.canEdit !== true ||
        (latest.data.isLocked && !canManage) ||
        (pending.minimumRevision !== null && latest.data.contentRevision < pending.minimumRevision))
        throw new Error("Current page version is unavailable");
      await updatePage.mutateAsync({
        pageId,
        [pending.field]: pending.value,
        expectedContentRevision: latest.data.contentRevision,
      });
      setPendingScope(null);
      toast.success(`${pending.field === "spaceId" ? "Space" : "Owner"} updated`);
    } catch {
      toast.error("Could not retry the setting change. Your choice is still available.");
    } finally {
      setIsRetryingScope(false);
    }
  }

  function handlePublish() {
    if (!isEditable) return;
    publishPage.mutate(pageId, {
      onSuccess: () => toast.success("Page published"),
      onError: () => toast.error("Failed to publish page"),
    });
  }

  function handleArchive() {
    if (!isEditable) return;
    archivePage.mutate(pageId, {
      onSuccess: () => toast.success("Page archived"),
      onError: () => toast.error("Failed to archive page"),
    });
  }

  function handleUnarchive() {
    if (!isEditable) return;
    unarchivePage.mutate(pageId, {
      onSuccess: () => toast.success("Page unarchived"),
      onError: () => toast.error("Failed to unarchive page"),
    });
  }

  function handleOpenVerifyForm() {
    setVerifyFormOpen(true);
    setIntervalDays("");
  }

  function handleIntervalDaysChange(e: React.ChangeEvent<HTMLInputElement>) {
    setIntervalDays(e.target.value);
  }

  function handleConfirmVerify() {
    if (!isEditable) return;
    const days = intervalDays ? Number(intervalDays) : undefined;
    verifyPage.mutate(
      { pageId, intervalDays: days },
      {
        onSuccess: () => {
          toast.success("Page verified");
          setVerifyFormOpen(false);
          setIntervalDays("");
        },
        onError: () => toast.error("Failed to verify page"),
      }
    );
  }

  function handleMarkStale() {
    if (!isEditable) return;
    markStalePage.mutate(pageId, {
      onSuccess: () => toast.success("Page marked as stale"),
      onError: () => toast.error("Failed to mark page as stale"),
    });
  }

  function handleCancelVerify() {
    setVerifyFormOpen(false);
    setIntervalDays("");
  }

  function handleClose() {
    onOpenChange(false);
  }

  function handleRequestReview() {
    setReviewDialogOpen(true);
  }

  const trustState = page.trustState ?? "unverified";
  const status = page.status ?? "draft";
  const showPublish = status !== "published";
  const statusActionCount = showPublish ? 2 : 1;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md p-0 flex flex-col bg-background">
        <SheetHeader className="px-5 py-4 border-b shrink-0 bg-background">
          <SheetTitle className="text-sm">Page settings</SheetTitle>
          <SheetDescription className="text-xs mt-0.5">
            Visibility, review schedule and other properties of this page.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="min-h-full px-5 py-4 space-y-5 bg-muted">
            {pendingScope?.pageId === pageId && (
              <div role="alert" className="space-y-2 rounded-lg border border-status-warning-rule bg-status-warning-surface p-3 text-sm text-status-warning-ink">
                <p>The page changed before your {pendingScope.field === "spaceId" ? "space" : "owner"} choice was saved. Your choice is ready to retry.</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={retryScopeChange} disabled={isRetryingScope || !isEditable || (pendingScope.field === "ownerUserId" && !canChangeOwner)}>
                    {isRetryingScope ? "Retrying…" : `Retry ${pendingScope.field === "spaceId" ? "space" : "owner"} change`}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPendingScope(null)} disabled={isRetryingScope}>Discard choice</Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-label font-medium text-foreground">Space</p>
              <Select
                value={page.spaceId != null ? String(page.spaceId) : "none"}
                onValueChange={handleSpaceChange}
                disabled={!isEditable}
              >
                <SelectTrigger className={FIELD_CLASS} aria-label="Space">
                  <SelectValue placeholder="No space" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-label">No space</SelectItem>
                  {spaces.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-label">
                      {s.icon ? `${s.icon} ` : ""}{s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-label font-medium text-foreground">Status</p>
              <Select value={status} onValueChange={handleStatusChange} disabled={!isEditable}>
                <SelectTrigger className={FIELD_CLASS} aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-label">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditable && (
                <div
                  className={
                    statusActionCount === 2
                      ? "grid grid-cols-2 gap-2 pt-1"
                      : "grid grid-cols-1 gap-2 pt-1"
                  }
                >
                  {showPublish && (
                    <LoadingButton
                      className={ACTION_BTN_BASE}
                      onClick={handlePublish}
                      isPending={publishPage.isPending}
                    >
                      Publish
                    </LoadingButton>
                  )}
                  {status !== "archived" ? (
                    <LoadingButton
                      variant="outline"
                      className={ACTION_BTN_DANGER}
                      onClick={handleArchive}
                      isPending={archivePage.isPending}
                    >
                      Archive
                    </LoadingButton>
                  ) : (
                    <LoadingButton
                      className={ACTION_BTN_BASE}
                      onClick={handleUnarchive}
                      isPending={unarchivePage.isPending}
                    >
                      Unarchive
                    </LoadingButton>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-label font-medium text-foreground">Content type</p>
              <Select value={page.contentType ?? ""} onValueChange={handleContentTypeChange} disabled={!isEditable}>
                <SelectTrigger className={FIELD_CLASS} aria-label="Content type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-label">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="kb-page-owner" className="text-label font-medium text-foreground">Owner</label>
              <UserCombobox
                id="kb-page-owner"
                value={page.ownerUserId ?? ""}
                onChange={handleOwnerChange}
                placeholder="Select owner…"
                allowUnassigned
                disabled={!canChangeOwner}
                className={FIELD_CLASS}
              />
            </div>

            {isEditable && (
              <div className="space-y-3">
                <p className="text-label font-medium text-foreground">Verification</p>
                <div className="flex items-center gap-2">
                  {trustState === "verified" && (
                    <Badge
                      variant="outline"
                      className="text-micro h-4 px-1.5 bg-status-success-surface text-status-success-ink border-status-success-rule"
                    >
                      Verified
                    </Badge>
                  )}
                  {trustState === "verification_expired" && (
                    <Badge
                      variant="outline"
                      className="text-micro h-4 px-1.5 bg-status-warning-surface text-status-warning-ink border-status-warning-rule"
                    >
                      Stale
                    </Badge>
                  )}
                  {trustState === "unverified" && (
                    <Badge
                      variant="outline"
                      className="text-micro h-4 px-1.5 bg-muted text-muted-foreground border-border"
                    >
                      Unverified
                    </Badge>
                  )}
                </div>
                {trustState === "verified" && page.verifiedUntil && (
                  <p className="text-xs text-muted-foreground">
                    Verified until {kbFormatDate(page.verifiedUntil)}
                  </p>
                )}
                {!verifyFormOpen ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className={ACTION_BTN_BASE}
                      onClick={handleOpenVerifyForm}
                    >
                      Verify
                    </Button>
                    <LoadingButton
                      variant="outline"
                      className={ACTION_BTN_WARNING}
                      onClick={handleMarkStale}
                      isPending={markStalePage.isPending}
                    >
                      Mark stale
                    </LoadingButton>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Review interval (days)"
                      value={intervalDays}
                      onChange={handleIntervalDaysChange}
                      className={FIELD_CLASS}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <LoadingButton
                        className={ACTION_BTN_BASE}
                        onClick={handleConfirmVerify}
                        isPending={verifyPage.isPending}
                      >
                        Confirm
                      </LoadingButton>
                      <Button
                        variant="outline"
                        className={ACTION_BTN_NEUTRAL}
                        onClick={handleCancelVerify}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {page.nextReviewAt && (
              <p className="text-xs text-muted-foreground">
                Next review: {kbFormatDate(page.nextReviewAt)}
              </p>
            )}

            {canManageReviews && (
              <div className="space-y-2">
                <p className="text-label font-medium text-foreground">Reviews</p>
                <Button type="button" variant="outline" className={ACTION_BTN_NEUTRAL} onClick={handleRequestReview}>
                  Request review
                </Button>
              </div>
            )}

            <PageRecordLinks pageId={pageId} />
          </div>
        </ScrollArea>

        <SheetFooter className="px-5 py-4 border-t shrink-0 bg-background">
          <Button variant="outline" className={ACTION_BTN_NEUTRAL} onClick={handleClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    <RequestReviewDialog
      pageId={pageId}
      pageTitle={page.title}
      open={reviewDialogOpen}
      onOpenChange={setReviewDialogOpen}
    />
    </>
  );
}
