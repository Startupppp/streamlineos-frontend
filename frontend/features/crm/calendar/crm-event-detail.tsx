"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, MapPin, Trash2, Pencil, Users, ExternalLink, Tag } from "lucide-react";
import {
  useDeleteCalendarEvent,
  useEventAttendees,
  useRsvpCalendarEvent,
  extractEventNumericId,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { toast } from "sonner";
import { resolveImageUrl, cn } from "@/lib/utils";
import Link from "next/link";

const CATEGORY_DOT_COLORS: Record<string, string> = {
  meeting: "bg-blue-500",
  call: "bg-green-500",
  demo: "bg-indigo-500",
  general: "bg-amber-500",
  other: "bg-slate-400",
  deadline: "bg-red-500",
  reminder: "bg-purple-500",
};

const ENTITY_PATHS: Record<string, string> = {
  LEAD: "/crm/leads",
  DEAL: "/crm/deals",
  CONTACT: "/crm/contacts",
};

interface CrmEventDetailProps {
  event: CalendarListItem | null;
  onClose: () => void;
  onEdit: (event: CalendarListItem) => void;
}

export function CrmEventDetail({ event, onClose, onEdit }: CrmEventDetailProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const numericId = extractEventNumericId(event?.id ?? "");
  const isCalendarEvent = event?.source === "event";

  const { data: attendees } = useEventAttendees(isCalendarEvent ? numericId : null);
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteCalendarEvent();
  const { mutate: rsvp } = useRsvpCalendarEvent();

  const handleSheetChange = useCallback(
    (v: boolean) => {
      if (!v) onClose();
    },
    [onClose],
  );

  const handleEdit = useCallback(() => {
    if (event) onEdit(event);
  }, [event, onEdit]);

  const handleOpenConfirm = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!numericId) return;
    deleteEvent(numericId, {
      onSuccess: () => {
        toast.success("Event deleted");
        setConfirmOpen(false);
        onClose();
      },
      onError: () => {
        toast.error("Failed to delete event");
      },
    });
  }, [numericId, deleteEvent, onClose]);

  const handleRsvpAccepted = useCallback(() => {
    if (!numericId) return;
    rsvp(
      { eventId: numericId, status: "accepted" },
      {
        onSuccess: () => toast.success("RSVP updated"),
        onError: () => toast.error("Failed to update RSVP"),
      },
    );
  }, [numericId, rsvp]);

  const handleRsvpTentative = useCallback(() => {
    if (!numericId) return;
    rsvp(
      { eventId: numericId, status: "tentative" },
      {
        onSuccess: () => toast.success("RSVP updated"),
        onError: () => toast.error("Failed to update RSVP"),
      },
    );
  }, [numericId, rsvp]);

  const handleRsvpDeclined = useCallback(() => {
    if (!numericId) return;
    rsvp(
      { eventId: numericId, status: "declined" },
      {
        onSuccess: () => toast.success("RSVP updated"),
        onError: () => toast.error("Failed to update RSVP"),
      },
    );
  }, [numericId, rsvp]);

  const dotColor = event ? (CATEGORY_DOT_COLORS[event.category] ?? "bg-slate-400") : "bg-slate-400";

  const entityPath =
    event?.entityType && event?.entityId && ENTITY_PATHS[event.entityType]
      ? `${ENTITY_PATHS[event.entityType]}/${event.entityId}`
      : null;

  const formattedStart = event
    ? format(new Date(event.start), event.allDay ? "MMM d, yyyy" : "MMM d, yyyy h:mm a")
    : "";
  const formattedEnd = event
    ? format(new Date(event.end), event.allDay ? "MMM d, yyyy" : "h:mm a")
    : "";

  const entityLabel = event?.entityType
    ? event.entityType.charAt(0) + event.entityType.slice(1).toLowerCase()
    : "";

  return (
    <>
      <Sheet open={!!event} onOpenChange={handleSheetChange}>
        <SheetContent
          side="right"
          className="flex flex-col gap-0 p-0 w-[380px] sm:max-w-[380px]"
        >
          <SheetHeader className="shrink-0 px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotColor)} />
              <SheetTitle className="text-base font-semibold leading-snug text-foreground">
                {event?.title}
              </SheetTitle>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {formattedStart}
                  {!event?.allDay && ` – ${formattedEnd}`}
                </span>
              </div>

              {event?.location && (
                <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  {event.location.startsWith("http") ? (
                    <a
                      href={event.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline truncate"
                    >
                      {event.location}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="truncate">{event.location}</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2.5 text-sm">
                <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Badge variant="secondary" className="capitalize text-xs">
                  {event?.category}
                </Badge>
              </div>

              {event?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              )}

              {entityPath && event?.entityType && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Linked {entityLabel}
                    </span>
                    <Link
                      href={entityPath}
                      className="flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
                    >
                      View {entityLabel}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </>
              )}

              {event?.creatorName && (
                <p className="text-xs text-muted-foreground">
                  Created by{" "}
                  <span className="text-foreground font-medium">{event.creatorName}</span>
                </p>
              )}

              {isCalendarEvent && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                      Your RSVP
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={event?.myRsvpStatus === "accepted" ? "default" : "outline"}
                        className={cn(
                          "flex-1 h-8 text-xs",
                          event?.myRsvpStatus === "accepted" &&
                            "bg-emerald-600 hover:bg-emerald-700 text-white border-0",
                        )}
                        onClick={handleRsvpAccepted}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant={event?.myRsvpStatus === "tentative" ? "default" : "outline"}
                        className={cn(
                          "flex-1 h-8 text-xs",
                          event?.myRsvpStatus === "tentative" &&
                            "bg-amber-500 hover:bg-amber-600 text-white border-0",
                        )}
                        onClick={handleRsvpTentative}
                      >
                        Maybe
                      </Button>
                      <Button
                        size="sm"
                        variant={event?.myRsvpStatus === "declined" ? "default" : "outline"}
                        className={cn(
                          "flex-1 h-8 text-xs",
                          event?.myRsvpStatus === "declined" &&
                            "bg-destructive text-destructive-foreground border-0 hover:bg-destructive/90",
                        )}
                        onClick={handleRsvpDeclined}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {attendees && attendees.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Attendees ({attendees.length})
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {attendees.map((attendee) => {
                        const initials = attendee.user?.name
                          ? attendee.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : (attendee.user?.email.slice(0, 2).toUpperCase() ?? "?");

                        return (
                          <div key={attendee.id} className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage
                                src={
                                  attendee.user?.image
                                    ? resolveImageUrl(attendee.user.image)
                                    : undefined
                                }
                                alt={attendee.user?.name ?? ""}
                              />
                              <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {attendee.user?.name ?? attendee.user?.email}
                              </p>
                              {attendee.user?.name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {attendee.user.email}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] shrink-0 capitalize",
                                attendee.status === "accepted" &&
                                  "border-emerald-200 text-emerald-700 bg-emerald-50",
                                attendee.status === "declined" &&
                                  "border-red-200 text-red-700 bg-red-50",
                                attendee.status === "tentative" &&
                                  "border-amber-200 text-amber-700 bg-amber-50",
                              )}
                            >
                              {attendee.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 gap-1.5"
              onClick={handleOpenConfirm}
              disabled={!isCalendarEvent}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleEdit}
                disabled={!isCalendarEvent}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete event"
        description="This will permanently delete the event and notify attendees. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
