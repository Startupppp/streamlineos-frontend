"use client";

import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
  useProject,
  useSprints,
  useSubtasks,
} from "@/lib/hooks/trpc-hooks";
import { queryKeys } from "@/lib/query-keys";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getSignedFileUrl, viewFile } from "@/hooks/use-file-url";
import { TicketHeader } from "./ticket-header";
import { TicketSidebar } from "./ticket-sidebar";
import { TicketComments } from "./ticket-comments";
import { TicketSubtasks } from "./ticket-subtasks";
import { WatcherList } from "./watcher-list";
import { ActivityFeed } from "./activity-feed";
import type { TicketDetailsDialogProps, ProjectMember } from "./types";

// ─── Attachment image with signed-URL resolution ──────────────────────────────

function AttachmentImage({
  fileUrl,
  fileName,
}: {
  fileUrl: string;
  fileName: string;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadImage = async () => {
      try {
        const signedUrl = await getSignedFileUrl(fileUrl);
        if (mounted) setImageSrc(signedUrl);
      } catch {
        if (mounted) setImageSrc(fileUrl);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadImage();
    return () => {
      mounted = false;
    };
  }, [fileUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={imageSrc || fileUrl}
      alt={fileName}
      fill
      unoptimized
      className="object-cover"
    />
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function TicketDetailsDialog({
  ticketId,
  open,
  onOpenChange,
  projectId,
  statuses,
}: TicketDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: ticket,
    isLoading,
    error: ticketError,
  } = useTicket(projectId, ticketId || 0);
  const { data: projectData } = useProject(projectId);
  const { data: sprints } = useSprints(projectId);
  const { data: subtasks } = useSubtasks(ticketId || 0);

  // Build members list from project data (includes manager)
  const members: ProjectMember[] = (() => {
    if (!projectData?.members) return [];
    const list = projectData.members
      .filter((m) => !!m.user)
      .map((m) => ({
        id: m.user!.id,
        name:
          m.user!.name ||
          `${m.user!.firstName || ""} ${m.user!.lastName || ""}`.trim(),
        firstName: m.user!.firstName || undefined,
        lastName: m.user!.lastName || undefined,
        image: m.user!.image || null,
        email: m.user!.email || "",
      }));
    const mgr =
      "manager" in projectData
        ? (
            projectData as {
              manager?: {
                id: string;
                name?: string | null;
                firstName?: string | null;
                lastName?: string | null;
                image?: string | null;
                email?: string | null;
              };
            }
          ).manager
        : undefined;
    if (mgr && !list.some((m) => m.id === mgr.id)) {
      list.unshift({
        id: mgr.id,
        name:
          mgr.name ||
          `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim(),
        firstName: mgr.firstName || undefined,
        lastName: mgr.lastName || undefined,
        image: mgr.image || null,
        email: mgr.email || "",
      });
    }
    return list;
  })();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.detail(projectId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.ticket(ticketId!),
    });
  }, [queryClient, projectId, ticketId]);

  const updateTicketMutation = useUpdateTicket(projectId, {
    onSuccess: () => {
      setSaving(false);
      invalidateAll();
    },
    onError: (error: Error) => {
      setSaving(false);
      toast.error(error.message || "Failed to update ticket");
    },
  });

  const deleteTicketMutation = useDeleteTicket(projectId, {
    onSuccess: () => {
      toast.success("Ticket deleted");
      invalidateAll();
      onOpenChange(false);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete ticket"),
  });

  const autoSave = useCallback(
    (field: Record<string, unknown>) => {
      if (!ticketId) return;
      setSaving(true);
      updateTicketMutation.mutate({ ticketId, ...field });
    },
    [ticketId, updateTicketMutation]
  );

  const debouncedSave = useCallback(
    (field: Record<string, unknown>) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setSaving(true);
      debounceTimerRef.current = setTimeout(() => {
        if (!ticketId) return;
        updateTicketMutation.mutate({ ticketId, ...field });
      }, 500);
    },
    [ticketId, updateTicketMutation]
  );

  useEffect(() => {
    if (ticket) {
      setLocalTitle(ticket.title);
      setLocalDescription(ticket.description || "");
    }
  }, [ticket]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-1/2 sm:max-w-[50vw] overflow-hidden p-0"
      >
        {/* Header */}
        <TicketHeader
          ticketId={ticketId}
          ticketNumber={ticket?.ticketNumber}
          priority={ticket?.priority || "MEDIUM"}
          status={ticket?.status || "TODO"}
          title={ticket?.title || ""}
          isLoading={isLoading}
          saving={saving}
          isDeleting={deleteTicketMutation.isPending}
          onDelete={() =>
            deleteTicketMutation.mutate({ ticketId: ticketId! })
          }
        />

        {/* Body */}
        <div className="overflow-y-auto h-[calc(100vh-120px)]">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Loading ticket details...</p>
            </div>
          ) : ticketError?.message?.includes("don't have access") ||
            ticketError?.message?.includes("FORBIDDEN") ? (
            <div className="py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">
                Restricted Access
              </p>
              <p className="text-sm text-muted-foreground">
                You can only view details of tickets assigned to you.
              </p>
            </div>
          ) : ticket ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Main content column */}
              <div className="lg:col-span-2 p-4 sm:p-6 space-y-6 border-r">
                {/* Title */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">
                    Title
                  </label>
                  <Input
                    value={localTitle}
                    onChange={(e) => {
                      setLocalTitle(e.target.value);
                      debouncedSave({ title: e.target.value });
                    }}
                    className="text-base font-medium border-0 bg-muted/30 focus-visible:bg-background focus-visible:ring-1"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">
                    Description
                  </label>
                  <Textarea
                    value={localDescription}
                    onChange={(e) => {
                      setLocalDescription(e.target.value);
                      debouncedSave({ description: e.target.value });
                    }}
                    className="min-h-[120px] border-0 bg-muted/30 focus-visible:bg-background focus-visible:ring-1 resize-none"
                    placeholder="Add a detailed description..."
                  />
                </div>

                {/* Subtasks */}
                <TicketSubtasks
                  ticketId={ticketId!}
                  projectId={projectId}
                  subtasks={subtasks || []}
                />

                {/* Attachments */}
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
                      Attachments
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {ticket.attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => viewFile(att.fileUrl)}
                          className="group relative aspect-video rounded-lg overflow-hidden bg-muted border hover:border-primary/50 transition-all hover:shadow-md text-left"
                        >
                          {att.mimeType &&
                          att.mimeType.startsWith("image/") ? (
                            <AttachmentImage
                              fileUrl={att.fileUrl}
                              fileName={att.fileName}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-2 text-center">
                              {att.fileName}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-5 w-5 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity Feed (comments) */}
                <ActivityFeed
                  ticketId={ticketId!}
                  comments={ticket.comments || []}
                />
              </div>

              {/* Sidebar column */}
              <div className="space-y-0">
                <TicketSidebar
                  ticket={ticket}
                  ticketId={ticketId!}
                  members={members}
                  sprints={sprints || []}
                  statuses={statuses}
                  onAutoSave={autoSave}
                />
                <div className="px-4 sm:px-6 pb-4 bg-muted/20">
                  <WatcherList
                    projectId={projectId}
                    ticketId={ticketId!}
                    members={members}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive font-medium">Ticket not found</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
