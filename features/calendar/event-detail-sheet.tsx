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
import { CalendarIcon, MapPin, Trash2, Tag, Pencil, Download, Users, Check, X, HelpCircle } from "lucide-react";
import {
  useDeleteCalendarEvent,
  useRsvpCalendarEvent,
  useEventAttendees,
  extractEventNumericId,
} from "@/lib/api/hooks/calendar";
import type { CalendarListItem } from "@/lib/api/hooks/calendar";
import { EventCreateDialog } from "./event-create-dialog";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#bd882c",
};

interface EventDetailSheetProps {
  event: CalendarListItem | null;
  onClose: () => void;
}

const RSVP_STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted",
  declined: "Declined",
  tentative: "Tentative",
  pending: "Pending",
};

export function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deleteEvent = useDeleteCalendarEvent();
  const rsvpMutation = useRsvpCalendarEvent();

  const numericEventId = event ? extractEventNumericId(event.id) : null;
  const isCalendarEvent = event?.source === "event";

  const { data: attendees = [] } = useEventAttendees(isCalendarEvent ? numericEventId : null);

  const handleDelete = useCallback(async () => {
    if (!event || numericEventId === null) return;
    try {
      await deleteEvent.mutateAsync(numericEventId);
      toast.success("Event deleted");
      onClose();
    } catch {
      toast.error("Failed to delete event");
    }
  }, [event, numericEventId, deleteEvent, onClose]);

  const handleRsvp = useCallback(
    async (status: "accepted" | "declined" | "tentative") => {
      if (!event || numericEventId === null) return;
      try {
        await rsvpMutation.mutateAsync({ eventId: numericEventId, status });
        toast.success(`RSVP updated: ${RSVP_STATUS_LABELS[status]}`);
      } catch {
        toast.error("Failed to update RSVP");
      }
    },
    [event, numericEventId, rsvpMutation]
  );

  const handleExportIcs = useCallback(() => {
    if (!event) return;
    const from = format(new Date(event.start), "yyyy-MM-dd");
    const to = format(new Date(event.end), "yyyy-MM-dd");
    window.open(`/api/calendar/export?from=${from}&to=${to}`, "_blank");
  }, [event]);

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
                        ? format(new Date(event.start), "PPP")
                        : `${format(new Date(event.start), "PPp")} – ${format(new Date(event.end), "p")}`}
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
                  {event.creatorName && (
                    <>
                      <Separator />
                      <p className="text-xs text-muted-foreground">Created by {event.creatorName}</p>
                    </>
                  )}

                  {isCalendarEvent && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your RSVP</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1.5 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-950"
                            disabled={rsvpMutation.isPending}
                            onClick={() => handleRsvp("accepted")}
                            aria-label="Accept event"
                          >
                            <Check className="h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1.5 text-yellow-600 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700 dark:text-yellow-400 dark:border-yellow-900 dark:hover:bg-yellow-950"
                            disabled={rsvpMutation.isPending}
                            onClick={() => handleRsvp("tentative")}
                            aria-label="Mark as tentative"
                          >
                            <HelpCircle className="h-3 w-3" />
                            Maybe
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950"
                            disabled={rsvpMutation.isPending}
                            onClick={() => handleRsvp("declined")}
                            aria-label="Decline event"
                          >
                            <X className="h-3 w-3" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {attendees.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <Users className="h-3 w-3" />
                          Attendees ({attendees.length})
                        </div>
                        <div className="space-y-1.5">
                          {attendees.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-sm">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={resolveImageUrl(a.user?.image ?? null)} />
                                <AvatarFallback className="text-[10px]">
                                  {(a.user?.name ?? a.user?.email ?? "?").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="flex-1 truncate text-xs">
                                {a.user?.name ?? a.user?.email ?? "Unknown"}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-4 px-1.5 capitalize ${
                                  a.status === "accepted"
                                    ? "border-green-200 text-green-600 dark:border-green-900 dark:text-green-400"
                                    : a.status === "declined"
                                      ? "border-red-200 text-red-600 dark:border-red-900 dark:text-red-400"
                                      : a.status === "tentative"
                                        ? "border-yellow-200 text-yellow-600 dark:border-yellow-900 dark:text-yellow-400"
                                        : "border-border text-muted-foreground"
                                }`}
                              >
                                {RSVP_STATUS_LABELS[a.status] ?? a.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
          <div className="px-5 py-3 border-t shrink-0 flex items-center justify-between gap-2">
            {isCalendarEvent ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportIcs}
                aria-label="Export as .ics"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                .ics
              </Button>
              {isCalendarEvent && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </div>
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
      <EventCreateDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        event={event}
      />
    </>
  );
}
