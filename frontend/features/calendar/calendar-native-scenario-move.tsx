"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { CalendarEventDetail } from "@/hooks/api/calendar";
import type { CommitmentReference } from "@/hooks/api/calendar-commitment-schema";
import { CalendarDateTimePicker } from "./calendar-date-time-picker";
import type { CalendarScenarioDraftStep } from "./calendar-scenario-draft";

function localDateTime(value: string): string {
  return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
}

export function CalendarNativeScenarioMove({ detail, root, onQueue }: {
  detail: CalendarEventDetail;
  root: CommitmentReference;
  onQueue: (draft: CalendarScenarioDraftStep) => void;
}) {
  const [start, setStart] = useState(() => localDateTime(detail.startDate));
  const [end, setEnd] = useState(() => localDateTime(detail.endDate));
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const valid = Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime &&
    (startTime !== new Date(detail.startDate).getTime() || endTime !== new Date(detail.endDate).getTime());

  return <div className="space-y-2 border-t px-5 py-3">
    <p className="text-sm font-medium">Try a meeting move</p>
    <p className="text-xs text-muted-foreground">Preview a new slot beside linked commitment changes. Applying requires confirmed availability and organizer access.</p>
    <div className="grid gap-2">
      <div className="space-y-1 text-xs"><p>Start</p><CalendarDateTimePicker id="scenario-meeting-start" label="Scenario meeting start" value={start} onChange={setStart} /></div>
      <div className="space-y-1 text-xs"><p>End</p><CalendarDateTimePicker id="scenario-meeting-end" label="Scenario meeting end" value={end} onChange={setEnd} /></div>
    </div>
    <Button size="sm" variant="outline" disabled={!valid} onClick={() => onQueue({
      root,
      label: `Move ${detail.title}`,
      step: {
        sourceKey: "calendar-native-events",
        sourceRecordId: String(detail.id),
        entityType: "event",
        sourceActionId: "move",
        expectedSourceVersion: String(detail.localVersion),
        intendedEffect: `Move meeting to ${new Date(startTime).toLocaleString()}`,
        input: {
          startDate: new Date(startTime).toISOString(),
          endDate: new Date(endTime).toISOString(),
          linkedSource: root,
        },
      },
    })}>Add meeting move to scenario</Button>
  </div>;
}
