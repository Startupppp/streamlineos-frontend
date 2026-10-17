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
  /** The people who must all attend, by user id. */
  panelUserIds: string[];
  durationMinutes?: number;
  /** Called with the ISO start when a recruiter picks one. */
  onPick?: (startIso: string) => void;
}

/**
 * Times the whole panel is free, over the next fortnight.
 *
 * The banner under the results is the part that matters. With no calendar
 * connected these slots avoid interviews already in StreamlineOS and nothing
 * else — an interviewer's own diary is invisible — and a recruiter who reads
 * "free" as "confirmed free" will double-book somebody and blame the product.
 * So the source of the answer is stated every time, not only when it is bad.
 */
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

            {/*
              Stated on every result, not only the blocked one. "These avoid
              interviews in StreamlineOS" is a smaller claim than "everyone is
              free", and the difference is a double-booked interviewer.
            */}
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
