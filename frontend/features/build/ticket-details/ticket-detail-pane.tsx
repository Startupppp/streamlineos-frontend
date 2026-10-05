"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTicketDetail } from "./use-ticket-detail";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { PriorityBadge } from "@/features/build/shared/priority-badge";

const TiptapEditorDynamic = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  { ssr: false },
);

interface TicketDetailPaneProps {
  ticketId: number;
  projectId: number;
  originHref: string;
}

export function TicketDetailPane({
  ticketId,
  projectId,
  originHref,
}: TicketDetailPaneProps) {
  const router = useRouter();
  const { ticket, isLoading, ticketError } = useTicketDetail({
    ticketId,
    projectId,
  });

  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading,
    isError: !!ticketError,
    error: ticketError ?? null,
  });

  function handleClose() {
    router.push(originHref, { scroll: false });
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose();
  }

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-xl flex-col p-0 sm:max-w-xl"
      >
        <SheetHeader className="flex flex-row items-center gap-2 border-b px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={handleClose}
            aria-label="Close ticket pane"
          >
            <X className="h-4 w-4" />
          </Button>
          <SheetTitle className="line-clamp-1 text-sm font-medium">
            {ticket ? ticket.title : "Ticket"}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-hidden">
          <PageState
            resolution={pageState}
            loading={null}
            onRetry={handleClose}
          >
            {ticket ? (
              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} size="sm" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {ticket.title}
                  </p>
                  {ticket.description ? (
                    <TiptapEditorDynamic
                      content={ticket.description}
                      contentKey={ticket.id}
                      editable={false}
                      output="html"
                    />
                  ) : null}
                </div>
              </ScrollArea>
            ) : null}
          </PageState>
        </div>
      </SheetContent>
    </Sheet>
  );
}
