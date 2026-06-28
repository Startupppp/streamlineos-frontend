"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, PartyPopper, MapPin, Users, UserPlus, CheckCircle2, Calendar } from "lucide-react";
import { useAbility } from "@/lib/abilities-context";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Participant {
  id: number;
  userId: string;
  status: string;
}

interface TeamEvent {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  date: string | null;
  time: string | null;
  maxParticipants: number | null;
  participants: Participant[];
  createdAt: string | null;
}

const eventKeys = {
  all: [...queryKeys.hr.all, "team-events"] as const,
  list: () => [...eventKeys.all, "list"] as const,
};

interface EventCardProps {
  event: TeamEvent;
  currentUserId: string | undefined;
  onRsvp: (id: number) => void;
  isRsvping: boolean;
}

function EventCard({ event: ev, currentUserId, onRsvp, isRsvping }: EventCardProps) {
  const handleRsvpClick = useCallback(() => onRsvp(ev.id), [onRsvp, ev.id]);
  const rsvpCount = ev.participants?.length ?? 0;
  const isRsvped = ev.participants?.some((p) => p.userId === currentUserId) ?? false;
  const eventDate = ev.date ? new Date(ev.date) : null;

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="flex">
        {eventDate && (
          <div className="w-16 shrink-0 bg-blue-50 dark:bg-blue-950/30 border-r border-border flex flex-col items-center justify-center py-4">
            <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {format(eventDate, "MMM")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300 leading-none">
              {format(eventDate, "d")}
            </p>
            {ev.time && (
              <p className="text-[9px] text-blue-500 dark:text-blue-400 mt-1">{ev.time}</p>
            )}
          </div>
        )}
        <CardContent className="p-3 flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
              {ev.title}
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 shrink-0">
              <PartyPopper className="h-2.5 w-2.5" />
              Event
            </span>
          </div>

          {ev.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2">{ev.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {ev.location && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" />
                <span className="truncate max-w-[100px]">{ev.location}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="h-2.5 w-2.5" />
              {rsvpCount} going
              {ev.maxParticipants ? ` / ${ev.maxParticipants}` : ""}
            </span>
          </div>

          {!eventDate && ev.createdAt && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              Added {format(new Date(ev.createdAt), "MMM d")}
            </span>
          )}

          {isRsvped ? (
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
            )}>
              <CheckCircle2 className="h-2.5 w-2.5" />
              Going
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs w-full"
              onClick={handleRsvpClick}
              disabled={isRsvping}
            >
              <UserPlus className="h-3 w-3" />
              RSVP
            </Button>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

export default function TeamEventsPage() {
  const qc = useQueryClient();
  const ability = useAbility();
  const { data: session } = useSession();
  const isAdmin = ability.can("manage", "hr:employees");

  const { data: events, isLoading, isError, refetch } = useQuery({
    queryKey: eventKeys.list(),
    queryFn: () => apiClient.get<TeamEvent[]>("/hr/team-events"),
  });

  const create = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      location?: string;
      startDate?: string;
      endDate?: string;
    }) => apiClient.post<TeamEvent>("/hr/team-events", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.list() }),
  });

  const rsvp = useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(`/hr/team-events/${id}`, { action: "rsvp" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartDate("");
    setEndDate("");
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleOpenCreateSheet = useCallback(() => setSheetOpen(true), []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value), []);
  const handleLocationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value), []);
  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value), []);
  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value), []);

  const handleCreate = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Event title is required"); return; }
    if (trimmedTitle.length < 2) { toast.error("Title must be at least 2 characters"); return; }
    if (!startDate) { toast.error("Event date is required"); return; }
    if (startDate && new Date(startDate) <= new Date()) {
      toast.error("Event date must be in the future");
      return;
    }
    if (endDate && startDate && endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }
    create.mutate(
      {
        title: trimmedTitle,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startDate,
        endDate: endDate || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Event created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, description, location, startDate, endDate, create, resetForm]);

  const handleRsvp = useCallback(
    (id: number) => {
      rsvp.mutate(id, {
        onSuccess: () => toast.success("RSVP confirmed"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [rsvp],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Team Events" subtitle="Company events and celebrations">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Team Events" subtitle="Company events, outings, and celebrations">
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <p className="text-sm text-muted-foreground">Failed to load team events.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Team Events"
      subtitle="Company events, outings, and celebrations"
      badge={`${events?.length ?? 0} events`}
      actions={
        isAdmin ? (
          <Button size="sm" className="gap-1.5" onClick={handleOpenCreateSheet}>
            <Plus className="h-3.5 w-3.5" />
            Create Event
          </Button>
        ) : undefined
      }
    >
      {!events?.length ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <EmptyState
            illustration={<PartyPopper className="h-8 w-8 text-muted-foreground" />}
            title="No upcoming events"
            description="Create team events to keep everyone informed and engaged."
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              currentUserId={session?.user?.id}
              onRsvp={handleRsvp}
              isRsvping={rsvp.isPending}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Create Event"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Event Title <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="e.g., Team Lunch"
            value={title}
            onChange={handleTitleChange}
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Event details..."
            value={description}
            onChange={handleDescriptionChange}
            rows={3}
            maxLength={2000}
            className="resize-none w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Location</label>
          <Input
            placeholder="e.g., Conference Room A"
            value={location}
            onChange={handleLocationChange}
            maxLength={200}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Start Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              value={startDate}
              onChange={handleStartDateChange}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date</label>
            <Input
              type="datetime-local"
              min={startDate || new Date().toISOString().slice(0, 16)}
              value={endDate}
              onChange={handleEndDateChange}
            />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
