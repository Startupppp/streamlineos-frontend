"use client";

import { useState } from "react";
import { toast } from "sonner";
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
  useUpdateKbPage,
  usePublishKbPage,
  useArchiveKbPage,
  useUnarchiveKbPage,
  useVerifyKbPage,
  useMarkStaleKbPage,
} from "@/hooks/api/kb/pages";
import { PageRecordLinks } from "./page-record-links";
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

export default function PageMetadataSheet({
  page,
  pageId,
  open,
  onOpenChange,
}: PageMetadataSheetProps) {
  const canManage = useCan("kb:pages:manage");
  const [intervalDays, setIntervalDays] = useState<string>("");
  const [verifyFormOpen, setVerifyFormOpen] = useState(false);

  const updatePage = useUpdateKbPage();
  const publishPage = usePublishKbPage();
  const archivePage = useArchiveKbPage();
  const unarchivePage = useUnarchiveKbPage();
  const verifyPage = useVerifyKbPage();
  const markStalePage = useMarkStaleKbPage();

  const { data: spaces = [] } = useKbSpaces();

  function handleSpaceChange(value: string) {
    updatePage.mutate(
      { pageId, spaceId: value === "none" ? null : Number(value) },
      { onSuccess: () => toast.success("Space updated"), onError: () => toast.error("Failed to update space") }
    );
  }

  function handleStatusChange(value: string) {
    updatePage.mutate(
      { pageId, status: value as "draft" | "in_review" | "published" | "archived" },
      { onError: () => toast.error("Failed to update status") }
    );
  }

  function handleContentTypeChange(value: string) {
    updatePage.mutate(
      { pageId, contentType: value },
      { onError: () => toast.error("Failed to update content type") }
    );
  }

  function handleOwnerChange(value: string) {
    updatePage.mutate(
      { pageId, ownerUserId: value || null },
      { onError: () => toast.error("Failed to update owner") }
    );
  }

  function handlePublish() {
    publishPage.mutate(pageId, {
      onSuccess: () => toast.success("Page published"),
      onError: () => toast.error("Failed to publish page"),
    });
  }

  function handleArchive() {
    archivePage.mutate(pageId, {
      onSuccess: () => toast.success("Page archived"),
      onError: () => toast.error("Failed to archive page"),
    });
  }

  function handleUnarchive() {
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

  const trustState = page.trustState ?? "unverified";
  const status = page.status ?? "draft";
  const showPublish = status !== "published";
  const statusActionCount = showPublish ? 2 : 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md p-0 flex flex-col bg-background">
        <SheetHeader className="px-5 py-4 border-b shrink-0 bg-background">
          <SheetTitle className="text-sm">Page settings</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="min-h-full px-5 py-4 space-y-5 bg-muted">
            <div className="space-y-2">
              <p className="text-label font-medium text-foreground">Space</p>
              <Select
                value={page.spaceId != null ? String(page.spaceId) : "none"}
                onValueChange={handleSpaceChange}
              >
                <SelectTrigger className={FIELD_CLASS}>
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
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className={FIELD_CLASS}>
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
              {canManage && (
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
              <Select value={page.contentType ?? ""} onValueChange={handleContentTypeChange}>
                <SelectTrigger className={FIELD_CLASS}>
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
              <p className="text-label font-medium text-foreground">Owner</p>
              <UserCombobox
                value={page.ownerUserId ?? ""}
                onChange={handleOwnerChange}
                placeholder="Select owner…"
                allowUnassigned
                className={FIELD_CLASS}
              />
            </div>

            {canManage && (
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
  );
}
