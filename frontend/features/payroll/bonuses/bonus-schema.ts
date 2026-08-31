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
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  FESTIVAL:
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  REFERRAL:
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  SPOT: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  ANNUAL:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  JOINING:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  RETENTION:
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  COMMISSION:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
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
