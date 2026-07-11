"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useMoodCheckin, useMyMoodHistory } from "@/hooks/api/hr/engagement";
import { getErrorMessage } from "@/lib/get-error-message";

const MOODS = [
  { value: 1, emoji: "😞", label: "Struggling" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

export function MoodCheckinWidget() {
  const [selected, setSelected] = useState<number | null>(null);
  const checkin = useMoodCheckin();
  const { data: history } = useMyMoodHistory();

  const todayStr = new Date().toISOString().slice(0, 10);
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
        <Sparkles className="h-4 w-4 text-blue-500" />
        <p className="text-sm font-medium text-foreground">How are you feeling today?</p>
      </div>
      <div className="flex items-center gap-2 justify-center">
        {MOODS.map(({ value, emoji, label }) => (
          <button
            key={value}
            type="button"
            title={label}
            onClick={() => handleSelect(value)}
            disabled={checkin.isPending}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border transition-all duration-150 text-center
              ${currentMood === value
                ? "border-blue-500 bg-blue-50 shadow-sm"
                : "border-border hover:border-blue-300 hover:bg-muted"
              }`}
          >
            <span className="text-xl leading-none">{emoji}</span>
            <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
          </button>
        ))}
      </div>
      {todayEntry && (
        <p className="text-[11px] text-center text-muted-foreground">
          You logged <span className="font-medium">{MOODS.find((m) => m.value === todayEntry.mood)?.label}</span> today
        </p>
      )}
    </div>
  );
}
