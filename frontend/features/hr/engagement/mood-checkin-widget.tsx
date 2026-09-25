"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useMoodCheckin, useMyMoodHistory } from "@/hooks/api/hr/engagement";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTodayString } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { MOODS } from "./mood-scale";

export function MoodCheckinWidget() {
  const [selected, setSelected] = useState<number | null>(null);
  const checkin = useMoodCheckin();
  const { data: history } = useMyMoodHistory();

  // Local calendar day: toISOString() is UTC and logged the wrong day east of UTC.
  const todayStr = getTodayString();
  const todayEntry = history?.find((h) => h.date === todayStr);

  const handleSelect = useCallback(
    (mood: number) => {
      setSelected(mood);
      toast.promise(checkin.mutateAsync({ mood, date: todayStr }), {
        loading: "Saving mood...",
        success: () => {
          setSelected(null);
          return "Mood logged!";
        },
        error: getErrorMessage,
      });
    },
    [checkin, todayStr],
  );

  const currentMood = todayEntry?.mood ?? selected;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground">How are you feeling today?</p>
      </div>
      <div className="flex items-center gap-2 justify-center">
        {MOODS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={currentMood === value}
            onClick={() => handleSelect(value)}
            disabled={checkin.isPending}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border transition-colors duration-150 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              currentMood === value
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border hover:border-primary/40 hover:bg-muted",
            )}
          >
            <Icon className="h-5 w-5 text-foreground" aria-hidden="true" />
            <span className="text-micro text-muted-foreground font-medium">{label}</span>
          </button>
        ))}
      </div>
      {todayEntry && (
        <p className="text-dense text-center text-muted-foreground">
          You logged <span className="font-medium">{MOODS.find((m) => m.value === todayEntry.mood)?.label}</span> today
        </p>
      )}
    </div>
  );
}
