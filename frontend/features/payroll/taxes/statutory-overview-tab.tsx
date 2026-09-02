"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import { useFilingCapabilities } from "@/hooks/api/payroll/filings";
import { getErrorMessage } from "@/lib/get-error-message";
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
          ? "inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border bg-status-success-surface text-status-success-ink border-status-success-rule"
          : "inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border bg-muted text-muted-foreground border-border"
      }
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

export function StatutoryOverviewTab() {
  const { data, isLoading, isError, error, refetch } = usePayrollPolicyCurrent();
  const { data: filingCapability } = useFilingCapabilities();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load statutory settings"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
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

  const country = data.policy?.country ?? "IN";
  const isNonIN = country !== "IN";
  const pack = data.statutoryPack;

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
      {filingCapability && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-1">
          <p className="text-xs font-medium text-foreground">
            India rule pack{" "}
            <span className="tabular-nums text-muted-foreground">
              {filingCapability.ruleBundleVersion ?? "IN-2025.04"}
            </span>
            {filingCapability.ruleEffectiveFrom ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · effective {filingCapability.ruleEffectiveFrom}
              </span>
            ) : null}
          </p>
          <p className="text-dense text-muted-foreground leading-snug">
            Production calc baseline (code registry). Not a legal-reviewed compliance pack.
            Filing exports are{" "}
            <span className="font-medium text-foreground">
              {filingCapability.honestyLabel ?? "export-only"}
            </span>
            {filingCapability.formLabels?.annualCertificate
              ? ` · ${filingCapability.formLabels.annualCertificate} full certificate not implemented`
              : null}
            .
          </p>
        </div>
      )}
      {isNonIN && pack ? (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            {pack.items.map((item, idx) => (
              <div
                key={item.key}
                className={`flex items-center justify-between px-4 py-3 gap-4 ${idx !== 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <TruncatedText text={item.label ?? item.key} className="text-label font-medium leading-snug" />
                </div>
                <EnabledBadge enabled={item.enabled} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
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
                    <p className="text-label font-medium leading-snug">{row.label}</p>
                    <p className="text-dense text-muted-foreground mt-0.5">{row.description}</p>
                    {row.key === "pf" && enabled && (pfEmployerRate || pfEmployeeRate) && (
                      <p className="text-dense text-muted-foreground mt-0.5">
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
      )}

      <p className="text-dense text-muted-foreground">
        Edit statutory settings in{" "}
        <Link href="/payroll/setup" className="text-primary underline underline-offset-2 hover:opacity-80">
          Payroll Setup
        </Link>
        .
      </p>
    </div>
  );
}
