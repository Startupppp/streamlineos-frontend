"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CalendarIcon, MapPin, Trash2, Tag } from "lucide-react";
import { useDeleteCalendarEvent } from "@/lib/api/hooks/calendar";
import type { CalendarEvent } from "@/lib/api/hooks/calendar";
import { toast } from "sonner";

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#bd882c",
};

interface EventDetailSheetProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

export function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteEvent = useDeleteCalendarEvent();

  const handleDelete = useCallback(async () => {
    if (!event) return;
    try {
      await deleteEvent.mutateAsync(event.id);
      toast.success("Event deleted");
      onClose();
    } catch {
      toast.error("Failed to delete event");
    }
  }, [event, deleteEvent, onClose]);

  const colorHex = event
    ? (EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue)
    : EVENT_COLORS.blue;

  return (
    <>
      <Sheet open={!!event} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="flex flex-col p-0 w-[360px] sm:max-w-[360px]">
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle className="text-sm font-semibold flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: colorHex }}
              />
              {event?.title ?? ""}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-3">
              {event && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {event.allDay
                        ? format(new Date(event.startDate), "PPP")
                        : `${format(new Date(event.startDate), "PPp")} – ${format(new Date(event.endDate), "p")}`}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {event.location.startsWith("http") ? (
                        <a
                          href={event.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline break-all"
                        >
                          {event.location}
                        </a>
                      ) : (
                        <span>{event.location}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="h-3.5 w-3.5 shrink-0" />
                    <Badge variant="outline" className="text-xs capitalize">{event.category}</Badge>
                  </div>
                  {event.description && (
                    <>
                      <Separator />
                      <p className="text-sm text-foreground">{event.description}</p>
                    </>
                  )}
                  {event.creator?.name && (
                    <>
                      <Separator />
                      <p className="text-xs text-muted-foreground">Created by {event.creator.name}</p>
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
          <div className="px-5 py-3 border-t shrink-0 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Event"
        description="This will permanently delete the event. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
