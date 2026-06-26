import { Users, DollarSign, CreditCard } from "lucide-react";

interface PayrollStatsProps {
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
}

export function PayrollStats({
  totalEmployees,
  totalGross,
  totalNet,
}: PayrollStatsProps) {
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-blue-500">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Employees
              </p>
              <p className="text-3xl font-bold tabular-nums text-blue-700 dark:text-blue-400">
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
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Gross
              </p>
              <p className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                {fmt(totalGross)}
              </p>
            </div>
            <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
              <DollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-emerald-500">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Net Payout
              </p>
              <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
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
