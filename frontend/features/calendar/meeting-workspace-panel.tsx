"use client";

import { CalendarClock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCalendarMeetingWorkspace,
  useInitializeCalendarMeetingWorkspace,
} from "@/hooks/api/calendar-meeting-workspace";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { MeetingPrepPanel } from "./meeting-prep-panel";
import { MeetingFollowUpPanel } from "./meeting-follow-up-panel";
import { MeetingWorkspaceContext } from "./meeting-workspace-context";
import { MeetingWorkspaceGovernance } from "./meeting-workspace-governance";
import { MeetingWorkspaceNotes } from "./meeting-workspace-notes";
import { MeetingWorkspaceOutcomes } from "./meeting-workspace-outcomes";

export function MeetingWorkspacePanel({ eventId, eventTitle }: { eventId: number; eventTitle: string }) {
  const workspaceQuery = useCalendarMeetingWorkspace(eventId);
  const initialize = useInitializeCalendarMeetingWorkspace();
  const workspace = workspaceQuery.data;

  if (workspaceQuery.isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-20 w-full" /></div>;

  if (workspaceQuery.isError) {
    return (
      <div className="rounded-lg border p-5 space-y-3">
        <p className="text-sm font-medium">Meeting workspace is unavailable</p>
        <p className="text-xs text-muted-foreground">{getErrorMessage(workspaceQuery.error)}</p>
        <Button size="sm" variant="outline" onClick={() => void workspaceQuery.refetch()}>Try again</Button>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="rounded-lg border p-5 text-center space-y-3">
        <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
        <div><p className="text-sm font-medium">Create the meeting workspace</p><p className="mt-1 text-xs text-muted-foreground">Bring permitted context, notes, decisions, and reviewed follow-ups into one place.</p></div>
        <Button size="sm" onClick={() => initialize.mutate(eventId, { onError: (error) => toast.error(getErrorMessage(error)) })} disabled={initialize.isPending}>Create workspace</Button>
      </div>
    );
  }

  const coverage = workspace.sourceCoverage;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <div><p className="text-sm font-medium">{workspace.eventTitle}</p><p className="text-micro text-muted-foreground">{coverage.available} available · {coverage.stale} stale · {coverage.unavailable} unavailable · {coverage.consentRequired} awaiting consent</p></div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void workspaceQuery.refetch()} aria-label="Refresh meeting workspace"><RefreshCw className="h-3.5 w-3.5" /></Button>
      </div>
      <Tabs defaultValue="prep">
        <TabsList className="w-full md:w-full">
          <TabsTrigger value="prep">Prep</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="governance">Controls</TabsTrigger>
        </TabsList>
        <TabsContent value="prep" className="pt-2 space-y-5"><MeetingPrepPanel eventId={String(eventId)} eventTitle={eventTitle} /><div className="border-t pt-4"><MeetingFollowUpPanel eventId={String(eventId)} workspaceId={workspace.id} /></div></TabsContent>
        <TabsContent value="context" className="pt-2"><MeetingWorkspaceContext workspace={workspace} /></TabsContent>
        <TabsContent value="notes" className="pt-2"><MeetingWorkspaceNotes workspace={workspace} /></TabsContent>
        <TabsContent value="outcomes" className="pt-2"><MeetingWorkspaceOutcomes workspace={workspace} onRefresh={() => void workspaceQuery.refetch()} /></TabsContent>
        <TabsContent value="governance" className="pt-2"><MeetingWorkspaceGovernance workspace={workspace} /></TabsContent>
      </Tabs>
    </div>
  );
}
