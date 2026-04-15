"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { useHrPayrollSummary } from "@/lib/api/hooks/hr/dashboard";

const PAYROLL_ROLES = ["CEO", "ADMIN", "FINANCE"];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PayrollSummaryWidget() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { data, isLoading } = useHrPayrollSummary();

  if (!role || !PAYROLL_ROLES.includes(role)) return null;

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Payroll Summary</CardTitle>
        </div>
        {data?.month && (
          <Badge variant="outline" className="text-[10px]">{data.month}</Badge>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : !data || data.employeeCount === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No payroll data for this month
          </p>
        ) : (
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Net Payout</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{formatINR(data.totalNet)}</span>
                {data.momChangePct !== null && (
                  <span
                    className={`flex items-center gap-0.5 text-xs ${
                      data.momChangePct >= 0 ? "text-destructive" : "text-emerald-500"
                    }`}
                  >
                    {data.momChangePct >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(data.momChangePct)}%
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Gross</p>
                <p className="font-medium">{formatINR(data.totalGross)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Deductions</p>
                <p className="font-medium">{formatINR(data.totalDeductions)}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {data.employeeCount} employees processed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
