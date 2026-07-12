const PALETTE = [
  { bg: "bg-sky-500/15", border: "border-sky-500", text: "text-sky-700 dark:text-sky-300", solid: "bg-sky-500" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500", text: "text-emerald-700 dark:text-emerald-300", solid: "bg-emerald-500" },
  { bg: "bg-amber-500/15", border: "border-amber-500", text: "text-amber-700 dark:text-amber-300", solid: "bg-amber-500" },
  { bg: "bg-violet-500/15", border: "border-violet-500", text: "text-violet-700 dark:text-violet-300", solid: "bg-violet-500" },
  { bg: "bg-rose-500/15", border: "border-rose-500", text: "text-rose-700 dark:text-rose-300", solid: "bg-rose-500" },
  { bg: "bg-cyan-500/15", border: "border-cyan-500", text: "text-cyan-700 dark:text-cyan-300", solid: "bg-cyan-500" },
];

export function recipientColor(index: number) {
  return PALETTE[index % PALETTE.length];
}
