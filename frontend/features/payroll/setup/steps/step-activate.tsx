"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useActivatePolicy } from "@/hooks/api/payroll";
import type { SetupDraft } from "@/features/payroll/setup/lib/draft";
import type { ActivateResult, ToggleKey } from "@/types/payroll/setup";
import { toast } from "sonner";

function toOverridesRecord(
  overrides: Partial<Record<string, boolean>> | undefined,
): Record<string, boolean> | undefined {
  if (!overrides) return undefined;
  return Object.fromEntries(
    Object.entries(overrides).filter((e): e is [string, boolean] => e[1] !== undefined),
  );
}

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  SEMI_MONTHLY: "Semi-Monthly",
  BI_WEEKLY: "Bi-Weekly",
  WEEKLY: "Weekly",
};

type StepActivateProps = {
  draft: SetupDraft;
  clearAll: () => void;
};

export function StepActivate({ draft, clearAll }: StepActivateProps) {
  const [activated, setActivated] = useState<ActivateResult | null>(null);
  const activate = useActivatePolicy();
  const shouldReduceMotion = useReducedMotion();

  function handleActivate() {
    if (!draft.policyId) {
      toast.error("Policy not found. Please restart the setup.");
      return;
    }
    activate.mutate(
      {
        policyId: draft.policyId,
        templateKey: draft.templateKey,
        toggleOverrides: toOverridesRecord(draft.toggleOverrides),
        payslipLayout: "MODERN",
        reason: "Initial setup",
      },
      {
        onSuccess: (result) => {
          setActivated(result);
          clearAll();
        },
        onError: () => toast.error("Failed to activate payroll. Please try again."),
      },
    );
  }

  if (activated) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <motion.div
          initial={shouldReduceMotion ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center"
        >
          <Check className="h-8 w-8 text-emerald-600" />
        </motion.div>

        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Payroll is live!</p>
          <p className="text-sm text-muted-foreground">
            {activated.componentCount} component{activated.componentCount !== 1 ? "s" : ""} configured
          </p>
        </div>

        {activated.checklist.length > 0 && (
          <div className="w-full text-left bg-muted rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Next Steps
            </p>
            <ul className="space-y-1.5">
              {activated.checklist.map((item) => (
                <li key={item.key} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-border flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  </span>
                  <div className="min-w-0">
                    {item.href ? (
                      <Link href={item.href} className="underline underline-offset-2">
                        {item.label}
                      </Link>
                    ) : (
                      <span>{item.label}</span>
                    )}
                    {item.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/payroll">Go to Payroll</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/payroll/components">View Components</Link>
          </Button>
        </div>
      </div>
    );
  }

  const effectiveToggles: Partial<Record<ToggleKey, boolean>> = {
    ...(draft.templateDefaultToggles ?? {}),
    ...(draft.toggleOverrides ?? {}),
  };
  const toggleCount = Object.values(effectiveToggles).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="bg-muted rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Configuration Summary
        </p>

        {draft.profile && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Country</span>
              <span className="font-medium text-foreground">{draft.profile.country}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium text-foreground">{draft.profile.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pay Frequency</span>
              <span className="font-medium text-foreground">
                {FREQUENCY_LABELS[draft.profile.payFrequency] ?? draft.profile.payFrequency}
              </span>
            </div>
          </div>
        )}

        <Separator />

        {draft.templateKey && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Template</span>
            <span className="font-medium text-foreground">{draft.templateKey}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Features enabled</span>
          <span className="font-medium text-foreground">{toggleCount}</span>
        </div>
      </div>

      <Button
        className="w-full"
        onClick={handleActivate}
        disabled={activate.isPending}
      >
        {activate.isPending ? "Activating…" : "Activate Payroll"}
      </Button>
    </div>
  );
}
