import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";

/** One mood scale for the check-in widget and the history list (no emoji icons, §4). */
export const MOODS: ReadonlyArray<{ value: number; icon: LucideIcon; label: string }> = [
  { value: 1, icon: Frown, label: "Struggling" },
  { value: 2, icon: Annoyed, label: "Meh" },
  { value: 3, icon: Meh, label: "Okay" },
  { value: 4, icon: Smile, label: "Good" },
  { value: 5, icon: Laugh, label: "Great" },
];
