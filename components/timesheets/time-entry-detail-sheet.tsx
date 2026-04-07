"use client";

import { useState } from "react";
import { format } from "date-fns";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Loader2, ExternalLink, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";

interface TimeEntry {
  id: number;
  userId: string | null;
  ticketId: number | null;
  date: string;
  hours: string | null;
  description: string | null;
  imageUrl: string | null;
  workLink: string | null;
  status: string | null;
  rejectionReason: string | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  } | null;
  ticket?: {
    id: number;
    projectId: number;
    project?: {
      name: string;
    };
  } | null;
  approverName?: string | null;
}

interface TimeEntryDetailSheetProps {
  entry: TimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeEntryDetailSheet({ entry, open, onOpenChange }: TimeEntryDetailSheetProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const utils = api.useUtils();

  const approveMutation = api.project.approveTimesheet.useMutation({
    onSuccess: () => {
      toast.success("Timesheet approved successfully");
      utils.project.getAllTeamTimesheets.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve timesheet");
    },
  });

  const rejectMutation = api.project.rejectTimesheet.useMutation({
    onSuccess: () => {
      toast.success("Timesheet rejected");
      utils.project.getAllTeamTimesheets.invalidate();
      setRejectDialogOpen(false);
      setRejectionReason("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject timesheet");
    },
  });

  const handleApprove = () => {
    if (!entry) return;
    approveMutation.mutate({ timesheetId: entry.id });
  };

  const handleRejectClick = () => {
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!entry) return;
    rejectMutation.mutate({
      timesheetId: entry.id,
      reason: rejectionReason,
    });
  };

  if (!entry) return null;

  const canApproveReject = !entry.status || entry.status === "PENDING";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Time Entry Details</SheetTitle>
            <SheetDescription>
              Review the time entry and approve or reject it
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b px-6">
              <Avatar className="h-10 w-10">
                <AvatarImage src={entry.user?.image || undefined} />
                <AvatarFallback>
                  {entry.user?.firstName?.[0]}
                  {entry.user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">
                  {entry.user?.firstName} {entry.user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{entry.user?.email}</p>
              </div>
              <Badge
                variant={
                  entry.status === "APPROVED"
                    ? "default"
                    : entry.status === "REJECTED"
                    ? "destructive"
                    : "secondary"
                }
              >
                {entry.status || "PENDING"}
              </Badge>
            </div>

            <div className="space-y-4 px-6 pt-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <p className="mt-1 text-sm">{format(new Date(entry.date), "MMMM d, yyyy")}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Hours</label>
                <p className="mt-1 text-sm font-medium">{entry.hours || "0"}h</p>
              </div>

              {entry.ticket?.project && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project</label>
                  <p className="mt-1">
                    <Badge variant="outline">{entry.ticket.project.name}</Badge>
                  </p>
                </div>
              )}

              {entry.ticketId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ticket</label>
                  <p className="mt-1 text-sm font-medium">#{entry.ticketId}</p>
                </div>
              )}

              {entry.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{entry.description}</p>
                </div>
              )}

              {entry.workLink && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Work Link</label>
                  <div className="mt-1">
                    <a
                      href={entry.workLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {entry.workLink}
                    </a>
                  </div>
                </div>
              )}

              {entry.imageUrl && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Work Image/Attachment</label>
                  <div className="mt-2 pl-4 pt-4 pr-4">
                    <div className="relative border rounded-lg overflow-hidden bg-muted/50">
                      {(() => {
                        const imageUrl = entry.imageUrl;
                        const normalizedUrl = imageUrl.startsWith("http") 
                          ? imageUrl 
                          : imageUrl.startsWith("/") 
                          ? imageUrl 
                          : `/uploads/${imageUrl}`;
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(imageUrl);
                        
                        return isImage ? (
                          <div className="relative w-full max-h-[500px] flex items-center justify-center">
                            <Image
                              src={normalizedUrl}
                              alt="Work attachment"
                              width={800}
                              height={500}
                              className="w-full h-auto max-h-[500px] object-contain"
                              unoptimized
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="p-4 text-center">
                                      <p class="text-sm text-muted-foreground mb-2">Unable to load image</p>
                                      <a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                        </svg>
                                        Open file
                                      </a>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">Document attachment</p>
                            <a
                              href={normalizedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open file
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {entry.status === "APPROVED" && entry.approverName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Approved By</label>
                  <p className="mt-1 text-sm">{entry.approverName}</p>
                </div>
              )}

              {entry.status === "REJECTED" && entry.rejectionReason && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Rejection Reason</label>
                  <p className="mt-1 text-sm text-red-600 whitespace-pre-wrap">{entry.rejectionReason}</p>
                </div>
              )}
            </div>

            {canApproveReject && (
              <div className="pt-4 border-t flex gap-2 px-6">
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="flex-1"
                  variant="default"
                >
                  {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  onClick={handleRejectClick}
                  disabled={rejectMutation.isPending}
                  className="flex-1"
                  variant="destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this timesheet entry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
