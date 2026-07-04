"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import type { ToggleKey } from "@/types/payroll/setup";

interface StatutoryRowConfig {
  key: ToggleKey;
  label: string;
  description: string;
}

const STATUTORY_ROWS: StatutoryRowConfig[] = [
  { key: "pf", label: "Provident Fund (PF)", description: "Employer + employee PF contributions" },
  { key: "esi", label: "ESI", description: "Employee State Insurance" },
  { key: "professionalTax", label: "Professional Tax", description: "State-level professional tax" },
  { key: "tds", label: "TDS", description: "Tax Deducted at Source" },
  { key: "gratuity", label: "Gratuity", description: "Gratuity accrual for eligible employees" },
  { key: "lwf", label: "Labour Welfare Fund (LWF)", description: "LWF contributions" },
];

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={
        enabled
          ? "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200"
          : "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-slate-100 text-slate-500 border-slate-200"
      }
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

export function StatutoryOverviewTab() {
  const { data, isLoading } = usePayrollPolicyCurrent();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data?.activeVersion) {
    return (
      <EmptyState
        title="No active policy found"
        description="Set up a payroll policy to configure statutory settings"
        action={{ label: "Go to Setup", href: "/payroll/setup" }}
      />
    );
  }

  const toggles = data.activeVersion.toggles;
  const config = data.activeVersion.config;
  const statutory = config.statutory;

  const pfEmployerRate =
    typeof statutory?.["pfEmployerRate"] === "number"
      ? `${statutory["pfEmployerRate"]}%`
      : null;
  const pfEmployeeRate =
    typeof statutory?.["pfEmployeeRate"] === "number"
      ? `${statutory["pfEmployeeRate"]}%`
      : null;

  return (
    <div className="space-y-2">
      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {STATUTORY_ROWS.map((row, idx) => {
            const enabled = toggles[row.key] ?? false;
            return (
              <div
                key={row.key}
                className={`flex items-center justify-between px-4 py-3 gap-4 ${idx !== 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium leading-snug">{row.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{row.description}</p>
                  {row.key === "pf" && enabled && (pfEmployerRate || pfEmployeeRate) && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {pfEmployerRate && `Employer: ${pfEmployerRate}`}
                      {pfEmployerRate && pfEmployeeRate && " · "}
                      {pfEmployeeRate && `Employee: ${pfEmployeeRate}`}
                    </p>
                  )}
                </div>
                <EnabledBadge enabled={enabled} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Edit statutory settings in{" "}
        <Link href="/payroll/setup" className="text-primary underline underline-offset-2 hover:opacity-80">
          Payroll Setup
        </Link>
        .
      </p>
    </div>
  );
}
