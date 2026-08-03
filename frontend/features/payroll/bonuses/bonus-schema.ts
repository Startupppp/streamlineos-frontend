import { z } from "zod";
import type { BonusType } from "@/hooks/api/payroll/bonuses-admin";

export const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SPOT", label: "Spot Award" },
  { value: "ANNUAL", label: "Annual" },
  { value: "JOINING", label: "Joining" },
  { value: "RETENTION", label: "Retention" },
  { value: "COMMISSION", label: "Commission" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export const CREATE_TYPE_OPTIONS: { value: BonusType; label: string }[] = [
  { value: "PERFORMANCE", label: "Performance" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SPOT", label: "Spot Award" },
  { value: "ANNUAL", label: "Annual" },
  { value: "JOINING", label: "Joining" },
  { value: "RETENTION", label: "Retention" },
  { value: "COMMISSION", label: "Commission" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PAID", label: "Paid" },
];

export const TYPE_COLORS: Record<string, string> = {
  PERFORMANCE:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  FESTIVAL:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  REFERRAL:
    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
  SPOT: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  ANNUAL:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  JOINING:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30",
  RETENTION:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  COMMISSION:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  ADJUSTMENT: "bg-muted text-muted-foreground border-border",
};

export const createBonusSchema = z.object({
  userId: z.string().min(1, "Employee ID is required"),
  type: z.enum([
    "PERFORMANCE",
    "FESTIVAL",
    "REFERRAL",
    "SPOT",
    "ANNUAL",
    "JOINING",
    "RETENTION",
    "COMMISSION",
    "ADJUSTMENT",
  ]),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) && n > 0;
    }, "Amount must be a positive number"),
  month: z.string().min(1, "Month is required"),
  reason: z.string().optional(),
  taxable: z.boolean(),
});

export type CreateBonusValues = z.infer<typeof createBonusSchema>;

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getBonusMonth(bonus: { month?: string | null; createdAt?: string | null }): string | null {
  if (bonus.month) return bonus.month;
  if (!bonus.createdAt) return null;
  const d = new Date(bonus.createdAt);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
