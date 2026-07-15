"use client";

import {
  LayoutDashboard,
  Table,
  Building2,
  Layers,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  Landmark,
  BarChart2,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PayrollReportType } from "@/types/payroll/reports";

interface ReportOption {
  type: PayrollReportType;
  label: string;
  icon: LucideIcon;
}

const REPORT_OPTIONS: ReportOption[] = [
  { type: "summary", label: "Summary", icon: LayoutDashboard },
  { type: "register", label: "Payroll Register", icon: Table },
  { type: "department-cost", label: "Dept Cost", icon: Building2 },
  { type: "cost-center", label: "Cost Center", icon: Layers },
  { type: "earnings", label: "Earnings", icon: TrendingUp },
  { type: "deductions", label: "Deductions", icon: TrendingDown },
  { type: "reimbursements", label: "Reimbursements", icon: Receipt },
  { type: "tax", label: "Tax", icon: FileText },
  { type: "bank-payout", label: "Bank Payout", icon: Landmark },
  { type: "variance", label: "Variance", icon: BarChart2 },
  { type: "journal", label: "Journal", icon: BookOpen },
];

interface ReportSelectorProps {
  activeReport: PayrollReportType;
  onSelect: (r: PayrollReportType) => void;
}

export function ReportSelector({ activeReport, onSelect }: ReportSelectorProps) {
  function handleSelectChange(v: string) {
    const found = REPORT_OPTIONS.find((o) => o.type === v);
    if (found) onSelect(found.type);
  }

  return (
    <>
      <nav
        className="hidden lg:flex w-52 shrink-0 flex-col gap-0.5"
        aria-label="Report types"
      >
        {REPORT_OPTIONS.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors text-left w-full",
              activeReport === type
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-current={activeReport === type ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="lg:hidden">
        <Select value={activeReport} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_OPTIONS.map(({ type, label }) => (
              <SelectItem key={type} value={type}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
