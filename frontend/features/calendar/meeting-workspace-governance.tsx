"use client";

import { useState } from "react";
import { Shield, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CalendarMeetingWorkspace } from "@/hooks/api/calendar-meeting-workspace-schema";
import { useUpdateCalendarMeetingWorkspace } from "@/hooks/api/calendar-meeting-workspace";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

export function MeetingWorkspaceGovernance({ workspace }: { workspace: CalendarMeetingWorkspace }) {
  const [retentionDate, setRetentionDate] = useState(workspace.retentionUntil?.slice(0, 10) ?? "");
  const update = useUpdateCalendarMeetingWorkspace();

  const apply = (body: { retentionUntil?: string | null; recordingConsentStatus?: "PENDING" | "GRANTED" | "WITHDRAWN" }) => {
    update.mutate({ workspaceId: workspace.id, expectedVersion: workspace.version, ...body }, {
      onSuccess: () => toast.success("Meeting governance updated"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium">Recording and transcript consent</p><Badge variant="outline" className="ml-auto text-micro">{workspace.recordingConsentStatus}</Badge></div>
        <p className="text-xs text-muted-foreground">Record consent before any recording or transcript source becomes available. Withdrawal immediately hides linked media.</p>
        <div className="flex gap-2">
          <Button size="sm" className="h-8 text-xs" onClick={() => apply({ recordingConsentStatus: "GRANTED" })}>Record consent</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => apply({ recordingConsentStatus: "WITHDRAWN" })}>Withdraw</Button>
        </div>
      </section>
      <section className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center gap-2"><TimerReset className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium">Workspace retention</p></div>
        <Label htmlFor="meeting-retention" className="text-xs">Remove retained workspace content after</Label>
        <div className="flex gap-2">
          <Input id="meeting-retention" type="date" value={retentionDate} onChange={(event) => setRetentionDate(event.target.value)} className="h-8 text-xs" />
          <Button size="sm" className="h-8 text-xs" onClick={() => apply({ retentionUntil: retentionDate ? new Date(`${retentionDate}T23:59:59.999Z`).toISOString() : null })}>Save</Button>
        </div>
        <p className="text-micro text-muted-foreground">Expired content is hidden from members, guests, and meeting AI.</p>
      </section>
    </div>
  );
}
