"use client";

import { LayoutGrid, Sparkles, Wallet } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { MODULE_CATALOG, needsPaymentsStep } from "../lib/constants";
import type { WizardData } from "../lib/types";

type WorkspacePreviewPanelProps = {
  data: WizardData;
};

export function WorkspacePreviewPanel({ data }: WorkspacePreviewPanelProps) {
  const modules = data.modules.length > 0 ? data.modules : data.installedApps;
  const showPaymentsTeaser = needsPaymentsStep(data.goals);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Your workspace will include
        </p>
        {modules.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">Select goals to see recommended modules here.</p>
        ) : (
          <ul className="space-y-1.5">
            {modules.map((moduleKey) => {
              const meta = MODULE_CATALOG[moduleKey];
              return (
                <li key={moduleKey} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
                  <LayoutGrid className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <TruncatedText text={meta?.label ?? moduleKey} className="text-[12px] font-medium text-foreground" />
                    {meta?.description && (
                      <TruncatedText text={meta.description} className="text-[10.5px] text-muted-foreground" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(data.industry || data.companyName) && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Summary</p>
          <div className="rounded-lg border border-border bg-card p-2.5 space-y-1">
            {data.companyName && (
              <TruncatedText text={data.companyName} className="text-[12px] text-foreground font-medium" />
            )}
            {data.industry && <p className="text-[11.5px] text-muted-foreground">{data.industry}</p>}
            {data.goals.length > 0 && (
              <p className="text-[11.5px] text-muted-foreground">{data.goals.length} goal{data.goals.length === 1 ? "" : "s"} selected</p>
            )}
          </div>
        </div>
      )}

      {showPaymentsTeaser && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 space-y-1">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-blue-800">
            <Wallet className="h-3.5 w-3.5" /> Payment readiness
          </p>
          <p className="text-[11px] text-blue-700">
            {data.paymentsChoice && data.paymentsChoice !== "skip"
              ? `${data.paymentsChoice === "razorpay" ? "Razorpay" : data.paymentsChoice === "stripe" ? "Stripe" : "Manual payments"} will be ready to configure in test mode after setup.`
              : "You selected a goal that usually needs online payments — you'll get a chance to connect a provider."}
          </p>
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Next checklist actions</p>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-muted-foreground shrink-0" /> Finish company profile
          </li>
          {showPaymentsTeaser && (
            <li className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-muted-foreground shrink-0" /> Connect payments
            </li>
          )}
          <li className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-muted-foreground shrink-0" /> Invite your team
          </li>
        </ul>
      </div>
    </div>
  );
}
