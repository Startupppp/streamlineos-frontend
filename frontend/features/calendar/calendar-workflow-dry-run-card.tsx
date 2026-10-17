"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { isRecord } from "@/lib/is-record";
import { useDryRunCalendarWorkflow } from "@/hooks/api/calendar-workflows";
import { calendarWorkflowTriggers, type CalendarWorkflowTrigger } from "@/hooks/api/calendar-workflows-schema";

export function CalendarWorkflowDryRunCard() {
  const dryRun = useDryRunCalendarWorkflow();
  const [trigger, setTrigger] = useState<CalendarWorkflowTrigger>("calendar.booking.created");
  const [aggregateType, setAggregateType] = useState("calendar_booking");
  const [aggregateId, setAggregateId] = useState("preview");
  const [payload, setPayload] = useState('{"lifecycle_state":"confirmed"}');

  function changeTrigger(value: string) {
    const selected = calendarWorkflowTriggers.find((candidate) => candidate === value);
    if (selected) setTrigger(selected);
  }

  async function preview() {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (!isRecord(parsed)) throw new Error("Payload must be a JSON object");
      await dryRun.mutateAsync({ trigger, aggregateType, aggregateId, aggregateVersion: 1, actorMembershipId: null, payload: parsed });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Dry-run preview</CardTitle><CardDescription>Evaluate current rules without creating or delivering effects.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="dry-trigger">Trigger</Label><Select value={trigger} onValueChange={changeTrigger}><SelectTrigger id="dry-trigger"><SelectValue /></SelectTrigger><SelectContent>{calendarWorkflowTriggers.map((value) => <SelectItem key={value} value={value}>{value.replace("calendar.", "")}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="dry-type">Aggregate type</Label><Input id="dry-type" value={aggregateType} onChange={(event) => setAggregateType(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="dry-id">Aggregate ID</Label><Input id="dry-id" value={aggregateId} onChange={(event) => setAggregateId(event.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="dry-payload">Event payload</Label><Textarea id="dry-payload" className="font-mono" value={payload} onChange={(event) => setPayload(event.target.value)} /></div>
        <div className="flex justify-end"><LoadingButton variant="outline" isPending={dryRun.isPending} onClick={() => void preview()}>Preview matches</LoadingButton></div>
        {dryRun.data ? <div className="rounded-lg border p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{dryRun.data.effects.length} effect{dryRun.data.effects.length === 1 ? "" : "s"}</p>{dryRun.data.limited ? <Badge variant="destructive">Limited by policy</Badge> : null}</div><div className="mt-2 space-y-2">{dryRun.data.effects.map((effect) => <div key={`${effect.ruleId}-${effect.actionIndex}`} className="rounded-md bg-muted p-2 text-sm"><span className="font-medium">{effect.ruleName}</span><span className="text-muted-foreground"> · {effect.action.channels.join(", ")} · {effect.action.title}</span></div>)}</div></div> : null}
      </CardContent>
    </Card>
  );
}
