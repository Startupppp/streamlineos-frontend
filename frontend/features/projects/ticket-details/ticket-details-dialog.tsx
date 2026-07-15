"use client";

import { useEffect, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetBody } from "@/components/ui/sheet";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { TicketHeader } from "./ticket-header";
import { TicketSidebar } from "./ticket-sidebar";
import { TicketDetailMainSection } from "./ticket-detail-main-section";
import { useTicketDetail } from "./use-ticket-detail";
import type { TicketDetailsDialogProps } from "./types";

export function TicketDetailsDialog({
  ticketId,
  open,
  onOpenChange,
  projectId,
  statuses: statusesProp,
  highlightCommentId,
}: TicketDetailsDialogProps) {
  const handleDeleted = () => onOpenChange(false);

  const {
    ticket,
    isLoading,
    ticketError,
    projectData,
    sprints,
    subtasks,
    members,
    statuses: statusesFromProject,
    saving,
    localTitle,
    handleTitleChange,
    handleDescriptionEditorChange,
    autoSave,
    handleDelete,
    isDeleting,
  } = useTicketDetail({ projectId, ticketId, onDeleted: handleDeleted });

  const statuses = statusesProp ?? statusesFromProject;

  const sheetTitle = useMemo(() => {
    if (isLoading) return "Loading...";
    return localTitle || ticket?.title || "";
  }, [isLoading, localTitle, ticket?.title]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-none lg:w-3/4 lg:max-w-[75vw] overflow-hidden p-0 flex flex-col"
      >
        <TicketHeader
          ticketId={ticketId}
          ticketNumber={ticket?.ticketNumber}
          projectKey={projectData?.key}
          priority={ticket?.priority || "MEDIUM"}
          status={ticket?.status || "TODO"}
          title={sheetTitle}
          isLoading={isLoading}
          saving={saving}
          isDeleting={isDeleting}
          onDelete={handleDelete}
        />

        <SheetBody>
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
              <Skeleton className="h-32 w-full" />
            </div>
          ) : isApiError(ticketError) && getApiErrorCode(ticketError) === "PROJECTS_FORBIDDEN_TICKET" ? (
            <div className="py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">Restricted Access</p>
              <p className="text-sm text-muted-foreground">
                You can only view details of tickets assigned to you.
              </p>
            </div>
          ) : isApiError(ticketError) && getApiErrorCode(ticketError) === "PROJECTS_TICKET_NOT_FOUND" ? (
            <div className="py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-2">Ticket not found</p>
              <p className="text-sm text-muted-foreground mb-4">This ticket may have been deleted.</p>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Back to board
              </Button>
            </div>
          ) : ticket && ticketId ? (
            <>
              <div className="border-b">
                <TicketSidebar
                  ticket={ticket}
                  ticketId={ticketId}
                  projectId={projectId}
                  members={members}
                  sprints={sprints}
                  statuses={statuses}
                  onAutoSave={autoSave}
                />
              </div>

              <div className="p-4">
                <TicketDetailMainSection
                  ticket={ticket}
                  ticketId={ticketId}
                  projectId={projectId}
                  projectKey={projectData?.key}
                  localTitle={localTitle}
                  subtasks={subtasks}
                  members={members}
                  highlightCommentId={highlightCommentId}
                  onTitleChange={handleTitleChange}
                  onDescriptionChange={handleDescriptionEditorChange}
                />
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive font-medium">Ticket not found</p>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
