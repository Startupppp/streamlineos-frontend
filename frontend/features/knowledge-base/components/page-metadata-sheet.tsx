"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  useUpdateKbPage,
  usePublishKbPage,
  useArchiveKbPage,
  useUnarchiveKbPage,
  useVerifyKbPage,
  useMarkStaleKbPage,
} from "@/hooks/api/kb/pages";
import { apiClient } from "@/lib/api-client";
import type { KbPageDetail } from "@/hooks/api/kb/pages";

type OrgUser = { id: string; name: string; email: string };

const STATUS_OPTIONS: Array<{ value: "draft" | "in_review" | "published" | "archived"; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface PageMetadataSheetProps {
  page: KbPageDetail;
  pageId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface PageMetadataSheetTriggerProps {
  onClick: () => void;
}

export function PageMetadataSheetTrigger({ onClick }: PageMetadataSheetTriggerProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      aria-label="Page settings"
    >
      <Info className="h-4 w-4" />
    </Button>
  );
}

export default function PageMetadataSheet({
  page,
  pageId,
  open,
  onOpenChange,
}: PageMetadataSheetProps) {
  const canManage = useCan("kb:pages:manage");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [intervalDays, setIntervalDays] = useState<string>("");
  const [verifyFormOpen, setVerifyFormOpen] = useState(false);

  const updatePage = useUpdateKbPage();
  const publishPage = usePublishKbPage();
  const archivePage = useArchiveKbPage();
  const unarchivePage = useUnarchiveKbPage();
  const verifyPage = useVerifyKbPage();
  const markStalePage = useMarkStaleKbPage();

  const { data: orgUsers = [] } = useQuery({
    queryKey: ["chat", "orgUsers"],
    queryFn: () => apiClient.get<OrgUser[]>("/chat/users"),
    staleTime: 120_000,
  });

  const filteredUsers = ownerSearch.trim()
    ? orgUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(ownerSearch.toLowerCase())
      )
    : orgUsers;

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
      { pageId, ownerUserId: value === "__unassigned__" ? null : value },
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

  function handleOwnerSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setOwnerSearch(e.target.value);
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-sm">Page settings</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-5">
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-foreground">Status</p>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManage && (
                <div className="flex items-center gap-2 pt-1">
                  {status !== "published" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handlePublish}
                      disabled={publishPage.isPending}
                    >
                      Publish
                    </Button>
                  )}
                  {status !== "archived" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={handleArchive}
                      disabled={archivePage.isPending}
                    >
                      Archive
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={handleUnarchive}
                      disabled={unarchivePage.isPending}
                    >
                      Unarchive
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-foreground">Content type</p>
              <Select value={page.contentType ?? ""} onValueChange={handleContentTypeChange}>
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-foreground">Owner</p>
              <Input
                placeholder="Search users..."
                value={ownerSearch}
                onChange={handleOwnerSearchChange}
                className="h-8 text-[13px]"
              />
              <Select
                value={page.ownerUserId ?? "__unassigned__"}
                onValueChange={handleOwnerChange}
              >
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__" className="text-[13px]">
                    Unassigned
                  </SelectItem>
                  {filteredUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-[13px]">
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManage && (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-foreground">Verification</p>
                <div className="flex items-center gap-2">
                  {trustState === "verified" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      Verified
                    </Badge>
                  )}
                  {trustState === "verification_expired" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Stale
                    </Badge>
                  )}
                  {trustState === "unverified" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 bg-slate-100 text-slate-600 border-slate-200"
                    >
                      Unverified
                    </Badge>
                  )}
                </div>
                {trustState === "verified" && page.verifiedUntil && (
                  <p className="text-[12px] text-muted-foreground">
                    Verified until {formatDate(page.verifiedUntil)}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {!verifyFormOpen ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleOpenVerifyForm}
                    >
                      Verify
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Review interval (days)"
                        value={intervalDays}
                        onChange={handleIntervalDaysChange}
                        className="h-7 text-xs w-40"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleConfirmVerify}
                        disabled={verifyPage.isPending}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleCancelVerify}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={handleMarkStale}
                    disabled={markStalePage.isPending}
                  >
                    Mark stale
                  </Button>
                </div>
              </div>
            )}

            {page.nextReviewAt && (
              <p className="text-[12px] text-muted-foreground">
                Next review: {formatDate(page.nextReviewAt)}
              </p>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="px-5 py-4 border-t shrink-0">
          <Button variant="outline" size="sm" className="w-full" onClick={handleClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
