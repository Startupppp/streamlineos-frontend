"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useJobBoardPostings,
  useCreateJobBoardPosting,
  useUpdateJobBoardPosting,
  useDeleteJobBoardPosting,
  type JobBoardPostingStatus,
} from "@/hooks/api/hr/recruitment";

const STATUS_OPTIONS: JobBoardPostingStatus[] = ["DRAFT", "POSTED", "EXPIRED", "CLOSED"];

const STATUS_BADGE: Record<JobBoardPostingStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-300",
  POSTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  EXPIRED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CLOSED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

interface ExternalBoardsSheetProps {
  jobId: number;
  onClose: () => void;
}

export function ExternalBoardsSheet({ jobId, onClose }: ExternalBoardsSheetProps) {
  const { data: postings, isLoading } = useJobBoardPostings(jobId);
  const createPosting = useCreateJobBoardPosting(jobId);
  const updatePosting = useUpdateJobBoardPosting(jobId);
  const deletePosting = useDeleteJobBoardPosting(jobId);

  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");

  const handleAdd = useCallback(() => {
    if (!platform.trim()) {
      toast.error("Enter a platform name");
      return;
    }
    createPosting.mutate(
      { platform: platform.trim().toUpperCase(), externalPostUrl: url.trim() || undefined, status: "POSTED" },
      {
        onSuccess: () => {
          toast.success("Posting tracked");
          setPlatform("");
          setUrl("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [platform, url, createPosting]);

  const handleStatusChange = useCallback(
    (id: number, status: JobBoardPostingStatus) => {
      updatePosting.mutate({ id, status }, { onError: (e) => toast.error(getErrorMessage(e)) });
    },
    [updatePosting],
  );

  const handleDelete = useCallback(
    (id: number) => {
      deletePosting.mutate(id, {
        onSuccess: () => toast.success("Posting removed"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deletePosting],
  );

  return (
    <Sheet open onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-md flex flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle className="text-base">External Job Board Postings</SheetTitle>
          <SheetDescription className="text-xs">
            Track where this role has been posted manually, and how it&apos;s performing.
          </SheetDescription>
        </SheetHeader>

        <div className="shrink-0 px-6 py-4 border-b space-y-2 bg-muted/20">
          <Label className="text-xs">Platform</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. LinkedIn, Naukri, Indeed"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Label className="text-xs">Posting URL (optional)</Label>
          <Input
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-8 text-sm"
          />
          <Button size="sm" className="w-full h-8 gap-1.5" onClick={handleAdd} disabled={createPosting.isPending}>
            <Plus className="h-3.5 w-3.5" />
            {createPosting.isPending ? "Adding…" : "Track posting"}
          </Button>
        </div>

        <SheetBody className="px-6 py-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !postings?.length ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No postings tracked yet for this role.
            </p>
          ) : (
            postings.map((posting) => (
              <div key={posting.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">{posting.platform}</span>
                    <Badge className={STATUS_BADGE[posting.status]} variant="outline">
                      {posting.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {posting.externalPostUrl && (
                      <a href={posting.externalPostUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {STATUS_OPTIONS.filter((s) => s !== posting.status).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => handleStatusChange(posting.id, s)}>
                            Mark as {s}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem variant="destructive"
                          onClick={() => handleDelete(posting.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{posting.applicantCount} applicants</span>
                  <span>{posting.qualifiedCount} qualified</span>
                  <span>{posting.hiredCount} hired</span>
                </div>
              </div>
            ))
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
