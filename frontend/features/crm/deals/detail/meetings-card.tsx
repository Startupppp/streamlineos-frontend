"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, Video, ExternalLink } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Meeting {
  id: number;
  title: string;
  scheduledAt: string;
  durationMinutes: number | null;
  status: string;
  attendees: string[] | null;
  agenda: string | null;
  notes: string | null;
  recordingLink: string | null;
}

interface DeleteMeetingButtonProps {
  meetingId: number;
  onDelete: (id: number) => void;
}

function DeleteMeetingButton({ meetingId, onDelete }: DeleteMeetingButtonProps) {
  const handleClick = useCallback(() => onDelete(meetingId), [meetingId, onDelete]);
  return (
    <Button variant="ghost" size="icon" className="w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={handleClick}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

interface MeetingsCardProps {
  meetings: Meeting[] | undefined;
  onAddMeeting: () => void;
  onDeleteMeeting: (id: number) => void;
  isLoading?: boolean;
}

export function MeetingsCard({
  meetings,
  onAddMeeting,
  onDeleteMeeting,
  isLoading = false,
}: MeetingsCardProps) {
  return (
    <Card className="shadow-noir">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Meetings</CardTitle>
        <Button size="sm" variant="outline" onClick={onAddMeeting}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
            ))}
          </div>
        ) : !meetings?.length ? (
          <EmptyState illustration={<EmptyCalendarIllustration />} title="No meetings scheduled" compact />
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <TruncatedText text={m.title} className="font-medium text-sm" />
                    <Badge variant="outline" className="text-micro shrink-0">{m.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(m.scheduledAt), "dd MMM yyyy, HH:mm")}
                    {m.durationMinutes ? ` · ${m.durationMinutes}min` : ""}
                  </p>
                  {m.agenda && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{m.agenda}</p>}
                  {m.recordingLink && (
                    <a href={m.recordingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                      <Video className="h-3 w-3" /> Recording <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                <DeleteMeetingButton meetingId={m.id} onDelete={onDeleteMeeting} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
