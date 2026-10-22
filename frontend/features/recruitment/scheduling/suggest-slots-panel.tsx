"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { formatEventTimeRange, readerTimeZone } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSuggestSlots, type SuggestedSlots } from "@/hooks/api/hr/recruitment/slot-suggestions";

const WINDOW_DAYS = 14;

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

interface Props {
  panelUserIds: string[];
  durationMinutes?: number;
  onPick?: (startIso: string) => void;
}

export function SuggestSlotsPanel({ panelUserIds, durationMinutes = 60, onPick }: Props) {
  const suggest = useSuggestSlots();
  const [result, setResult] = useState<SuggestedSlots | null>(null);

  const handleFind = useCallback(() => {
    if (panelUserIds.length === 0) {
      toast.error("Pick at least one interviewer first.");
      return;
    }
    suggest.mutate(
      {
        panelUserIds,
        from: new Date().toISOString(),
        to: isoDaysFromNow(WINDOW_DAYS),
        durationMinutes,
        limit: 20,
      },
      {
        onSuccess: (slots) => setResult(slots),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [suggest, panelUserIds, durationMinutes]);

  const handlePick = useCallback(
    (startIso: string) => {
      onPick?.(startIso);
    },
    [onPick],
  );

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Find a time</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Slots over the next {WINDOW_DAYS} days when everyone on the panel is free, shown in{" "}
              {readerTimeZone()}.
            </p>
          </div>
          <LoadingButton size="sm" onClick={handleFind} isPending={suggest.isPending}>
            Find times
          </LoadingButton>
        </div>

        {result && (
          <div className="space-y-2">
            {result.slots.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
                No time in the next {WINDOW_DAYS} days works for everyone on this panel. Try a
                shorter interview, or a smaller panel.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {result.slots.map((slot) => (
                  <SlotButton key={slot.start} slot={slot} onPick={handlePick} />
                ))}
              </div>
            )}

            
            <p className="text-xs text-muted-foreground">
              {result.source === "calendar"
                ? "Checked against each interviewer's connected calendar."
                : (result.blockedReason ??
                  "These slots avoid interviews already in StreamlineOS. Nobody's own calendar was checked.")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SlotButton({
  slot,
  onPick,
}: {
  slot: { start: string; end: string };
  onPick: (startIso: string) => void;
}) {
  const handleClick = useCallback(() => onPick(slot.start), [onPick, slot.start]);
  return (
    <Button variant="outline" size="sm" className="justify-start h-auto py-2" onClick={handleClick}>
      <span className="text-xs font-mono tabular-nums">
        {formatEventTimeRange(slot.start, slot.end)}
      </span>
    </Button>
  );
}
