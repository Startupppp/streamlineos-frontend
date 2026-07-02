import { Users, DollarSign, CreditCard, TrendingDown } from "lucide-react";

interface PayrollStatsProps {
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
}

export function PayrollStats({
  totalEmployees,
  totalGross,
  totalNet,
  totalDeductions,
}: PayrollStatsProps) {
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-blue-500">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Total Employees
              </p>
              <p className="text-3xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-1.5 leading-none">
                {totalEmployees}
              </p>
            </div>
            <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-amber-500">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Total Gross
              </p>
              <p className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-400 mt-1.5 leading-none">
                {fmt(totalGross)}
              </p>
            </div>
            <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
              <DollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-rose-500">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Total Deductions
              </p>
              <p className="text-3xl font-bold tabular-nums text-rose-700 dark:text-rose-400 mt-1.5 leading-none">
                {fmt(totalDeductions)}
              </p>
            </div>
            <div className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
              <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-emerald-500">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Total Net Payout
              </p>
              <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1.5 leading-none">
                {fmt(totalNet)}
              </p>
            </div>
            <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
