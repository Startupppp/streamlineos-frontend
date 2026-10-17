"use client";

import { AlertCircle, CalendarClock, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

const COVERAGE = [
  ["available", "Available"],
  ["stale", "Stale"],
  ["unavailable", "Unavailable"],
  ["consentRequired", "Awaiting consent"],
] as const;

export function MeetingWorkspacePanel({ eventId, eventTitle }: { eventId: number; eventTitle: string }) {
  const workspaceQuery = useCalendarMeetingWorkspace(eventId);
  const initialize = useInitializeCalendarMeetingWorkspace();
  const workspace = workspaceQuery.data;

  const handleRetry = () => {
    void workspaceQuery.refetch();
  };

  const handleCreate = () => {
    initialize.mutate(eventId, {
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  if (workspaceQuery.isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (workspaceQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Meeting workspace is unavailable</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{getErrorMessage(workspaceQuery.error)}</span>
          <Button size="sm" variant="outline" onClick={handleRetry}>Try again</Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg bg-muted px-4 py-8 text-center dark:border dark:border-background">
        <CalendarClock className="size-8 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Create the meeting workspace</p>
          <p className="text-sm text-muted-foreground">Bring permitted context, notes, decisions, and reviewed follow-ups into one place.</p>
        </div>
        <Button size="sm" onClick={handleCreate} disabled={initialize.isPending}>Create workspace</Button>
      </div>
    );
  }

  const coverage = workspace.sourceCoverage;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Source coverage</p>
        <Button variant="outline" size="icon" onClick={handleRetry} aria-label="Refresh meeting workspace">
          <RefreshCw className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COVERAGE.map(([key, label]) => (
          <div key={key} className="rounded-lg bg-muted px-3 py-2.5 dark:border dark:border-background">
            <p className="text-lg font-semibold tabular-nums">{coverage[key]}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <Tabs defaultValue="prep">
        <TabsList className="w-full md:w-full">
          <TabsTrigger value="prep">Prep</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="governance">Controls</TabsTrigger>
        </TabsList>
        <TabsContent value="prep" className="space-y-4">
          <MeetingPrepPanel eventId={String(eventId)} eventTitle={eventTitle} />
          <Separator />
          <MeetingFollowUpPanel eventId={String(eventId)} workspaceId={workspace.id} />
        </TabsContent>
        <TabsContent value="context"><MeetingWorkspaceContext workspace={workspace} /></TabsContent>
        <TabsContent value="notes"><MeetingWorkspaceNotes workspace={workspace} /></TabsContent>
        <TabsContent value="outcomes"><MeetingWorkspaceOutcomes workspace={workspace} onRefresh={handleRetry} /></TabsContent>
        <TabsContent value="governance"><MeetingWorkspaceGovernance workspace={workspace} /></TabsContent>
      </Tabs>
    </div>
  );
}
