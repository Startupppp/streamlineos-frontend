"use client";

import { Shield, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import type { CalendarMeetingWorkspace } from "@/hooks/api/calendar-meeting-workspace-schema";
import { useUpdateCalendarMeetingWorkspace } from "@/hooks/api/calendar-meeting-workspace";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

export function MeetingWorkspaceGovernance({ workspace }: { workspace: CalendarMeetingWorkspace }) {
  const [retentionDate, setRetentionDate] = useSourceOverride(
    `${workspace.id}:${workspace.retentionUntil ?? ""}`,
    workspace.retentionUntil?.slice(0, 10) ?? "",
  );
  const update = useUpdateCalendarMeetingWorkspace();

  const apply = (body: { retentionUntil?: string | null; recordingConsentStatus?: "PENDING" | "GRANTED" | "WITHDRAWN" }) => {
    update.mutate({ workspaceId: workspace.id, expectedVersion: workspace.version, ...body }, {
      onSuccess: () => toast.success("Meeting governance updated"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-lg bg-muted p-3 dark:border dark:border-background">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Recording and transcript consent</p>
          <Badge variant="outline" className="ml-auto">{workspace.recordingConsentStatus}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Record consent before any recording or transcript source becomes available. Withdrawal immediately hides linked media.</p>
        {workspace.canManage ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => apply({ recordingConsentStatus: "GRANTED" })}>Record consent</Button>
            <Button variant="outline" size="sm" onClick={() => apply({ recordingConsentStatus: "WITHDRAWN" })}>Withdraw</Button>
          </div>
        ) : null}
      </section>
      <section className="space-y-3 rounded-lg bg-muted p-3 dark:border dark:border-background">
        <div className="flex items-center gap-2">
          <TimerReset className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Workspace retention</p>
        </div>
        <Label htmlFor="meeting-retention">Remove retained workspace content after</Label>
        {workspace.canManage ? (
          <div className="flex items-center gap-2">
            <DatePicker
              id="meeting-retention"
              value={retentionDate}
              onChange={setRetentionDate}
              ariaLabel="Remove retained workspace content after"
              className="min-w-0 flex-1"
            />
            <Button size="sm" className="shrink-0" onClick={() => apply({ retentionUntil: retentionDate ? new Date(`${retentionDate}T23:59:59.999Z`).toISOString() : null })}>Save</Button>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">Expired content is hidden from members, guests, and meeting AI.</p>
      </section>
    </div>
  );
}
