import { z } from "zod";
import { StickyNote, ListTodo, Mail, Phone } from "lucide-react";

// ─── Pipeline ────────────────────────────────────────────────────────────────

export const STATUS_PIPELINE = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
] as const;

export type PipelineStatus = (typeof STATUS_PIPELINE)[number];

export const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  NEW: { color: "text-blue-400", bg: "bg-blue-500/15" },
  CONTACTED: { color: "text-sky-400", bg: "bg-sky-500/15" },
  INTERESTED: { color: "text-amber-400", bg: "bg-amber-500/15" },
  QUALIFIED: { color: "text-purple-400", bg: "bg-purple-500/15" },
  CONVERTED: { color: "text-emerald-400", bg: "bg-emerald-500/15" },
  LOST: { color: "text-red-400", bg: "bg-red-500/15" },
};

export const PRIORITY_STYLES: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  HOT: { label: "Hot", color: "text-red-400", bg: "bg-red-500/15" },
  WARM: { label: "Warm", color: "text-amber-400", bg: "bg-amber-500/15" },
  COLD: { label: "Cold", color: "text-blue-400", bg: "bg-blue-500/15" },
};

export const TIMELINE_ICONS: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  note: { icon: StickyNote, color: "bg-amber-500/15 text-amber-400" },
  task: { icon: ListTodo, color: "bg-purple-500/15 text-purple-400" },
  email: { icon: Mail, color: "bg-blue-500/15 text-blue-400" },
  activity: { icon: Phone, color: "bg-green-500/15 text-green-400" },
};

// ─── Quick action discriminated union ────────────────────────────────────────

export type QuickAction = "call" | "email" | "note" | "task" | null;

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const noteSchema = z.object({
  body: z.string().min(1, "Note cannot be empty"),
});
export type NoteForm = z.infer<typeof noteSchema>;

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  dueDate: z.string().optional(),
});
export type TaskForm = z.infer<typeof taskSchema>;

export const emailSchema = z.object({
  to: z.string().email("Valid email required"),
  subject: z.string().min(1, "Subject required"),
  body: z.string().min(1, "Body required"),
});
export type EmailForm = z.infer<typeof emailSchema>;

export const callSchema = z.object({
  subject: z.string().optional(),
  duration: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
});
export type CallForm = z.infer<typeof callSchema>;

export const editSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
  potentialValue: z.string().optional(),
  investmentInterest: z.string().optional(),
  notes: z.string().optional(),
});
export type EditForm = z.infer<typeof editSchema>;

// ─── Helper utilities ─────────────────────────────────────────────────────────

export function getScoreBadge(score: number | null | undefined) {
  const s = score ?? 0;
  if (s <= 30) return { label: "Low", color: "text-red-400", bg: "bg-red-500/15" };
  if (s <= 60)
    return { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/15" };
  return { label: "Hot", color: "text-emerald-400", bg: "bg-emerald-500/15" };
}

export function getSlaCountdown(deadline: Date | string | null | undefined) {
  if (!deadline) return null;
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  if (diff <= 0)
    return { label: "Breached", color: "text-red-400 bg-red-500/15" };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 4)
    return {
      label: `${hours}h ${mins}m left`,
      color: "text-amber-400 bg-amber-500/15",
    };
  return {
    label: `${hours}h ${mins}m left`,
    color: "text-emerald-400 bg-emerald-500/15",
  };
}
