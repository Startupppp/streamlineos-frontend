"use client";

import { Building2, CreditCard, Database, FileUp, LayoutGrid, Sparkles, SkipForward, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  MODULE_CATALOG, STARTING_DATA_OPTIONS, PAYMENT_PROVIDER_OPTIONS, needsPaymentsStep,
} from "../lib/constants";
import type { PaymentsChoice, StartingDataChoice, WizardData } from "../lib/types";
import { NavButtons } from "./nav-buttons";
import { TruncatedText } from "@/components/ui/truncated-text";

type StepSetupProps = {
  data: WizardData;
  recommendedReasons?: Record<string, string>;
  onToggleModule: (moduleKey: string) => void;
  patch: (updates: Partial<WizardData>) => void;
  onBack: () => void;
  onNext: () => void;
};

const STARTING_DATA_ICONS: Record<StartingDataChoice, LucideIcon> = {
  clean: Database, sample: Sparkles, import: FileUp,
};

const PAYMENT_ICONS: Record<PaymentsChoice, LucideIcon> = {
  razorpay: Wallet, stripe: CreditCard, manual: Building2, skip: SkipForward,
};

const OPTION_SELECTED =
  "border-brand-core bg-brand-core/10 dark:bg-brand-core/15";
const OPTION_IDLE = "border-border bg-card hover:border-brand-core/40";
const OPTION_LABEL_SELECTED = "text-brand-deep dark:text-brand-bright";

export function StepSetup({ data, recommendedReasons, onToggleModule, patch, onBack, onNext }: StepSetupProps) {
  const showPayments = needsPaymentsStep(data.goals);

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <p className="text-[12px] font-semibold text-foreground">Recommended modules</p>
        <div className="space-y-1.5">
          {Object.entries(MODULE_CATALOG).map(([key, meta]) => {
            const selected = data.modules.includes(key);
            const reason = recommendedReasons?.[key];
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
                  selected ? "border-brand-core/40 bg-brand-core/5 dark:bg-brand-core/10" : "border-border bg-card",
                )}
              >
                <LayoutGrid className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-brand-core" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-medium text-foreground">{meta.label}</span>
                    <span className={cn(
                      "text-[9.5px] font-medium px-1.5 py-0.5 rounded-full border",
                      selected
                        ? "border-brand-core/30 bg-brand-core/10 text-brand-deep dark:bg-brand-core/15 dark:text-brand-bright"
                        : "border-border bg-muted text-muted-foreground",
                    )}>
                      {selected ? "Included" : "Optional"}
                    </span>
                  </div>
                  <TruncatedText text={reason ?? meta.description ?? ""} className="text-[10.5px] text-muted-foreground" />
                </div>
                <Switch checked={selected} onCheckedChange={() => onToggleModule(key)} aria-label={`Toggle ${meta.label}`} className="shrink-0" />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[12px] font-semibold text-foreground">Starting data</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {STARTING_DATA_OPTIONS.map((option) => {
            const selected = data.startingData === option.id;
            const Icon = STARTING_DATA_ICONS[option.id];
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => patch({ startingData: option.id })}
                className={cn(
                  "flex flex-col gap-1 p-2.5 rounded-lg border text-left transition-colors press-scale",
                  selected ? OPTION_SELECTED : OPTION_IDLE,
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-brand-core" : "text-muted-foreground")} />
                <span className={cn("text-[11.5px] font-medium", selected ? OPTION_LABEL_SELECTED : "text-foreground")}>{option.label}</span>
                <p className="text-[10px] text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {showPayments && (
        <section className="space-y-2">
          <p className="text-[12px] font-semibold text-foreground">Payments</p>
          <p className="text-[10.5px] text-muted-foreground -mt-1">Connect a provider now, or skip and do it later from Settings.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {PAYMENT_PROVIDER_OPTIONS.map((option) => {
              const selected = data.paymentsChoice === option.id;
              const Icon = PAYMENT_ICONS[option.id];
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => patch({ paymentsChoice: option.id })}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors press-scale",
                    selected ? OPTION_SELECTED : OPTION_IDLE,
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-brand-core" : "text-muted-foreground")} />
                  <span className={cn("text-[11.5px] font-medium", selected ? OPTION_LABEL_SELECTED : "text-foreground")}>{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={data.modules.length === 0} />
    </div>
  );
}
