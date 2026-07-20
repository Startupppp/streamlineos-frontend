"use client";

import { memo, useCallback, type MouseEvent, type Ref } from "react";
import type { IconHandle } from "@animateicons/react";
import {
  SparklesIcon,
  WalletIcon,
  CreditCardIcon,
  BoxesIcon,
} from "@animateicons/react/lucide";
import { Building2, Database, FileUp, SkipForward } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  MODULE_CATALOG,
  STARTING_DATA_OPTIONS,
  PAYMENT_PROVIDER_OPTIONS,
  needsPaymentsStep,
} from "../lib/constants";
import type { PaymentsChoice, StartingDataChoice, WizardData } from "../lib/types";
import { ModuleRow } from "./module-row";
import { NavButtons } from "./nav-buttons";

type StepSetupProps = {
  data: WizardData;
  recommendedReasons?: Record<string, string>;
  onToggleModule: (moduleKey: string) => void;
  patch: (updates: Partial<WizardData>) => void;
  onBack: () => void;
  onNext: () => void;
};

type AnimatedIcon = typeof SparklesIcon;

const STARTING_DATA_ANIMATED: Partial<Record<StartingDataChoice, AnimatedIcon>> = {
  sample: SparklesIcon,
};

const STARTING_DATA_STATIC: Partial<Record<StartingDataChoice, LucideIcon>> = {
  clean: Database,
  import: FileUp,
};

const PAYMENT_ANIMATED: Partial<Record<PaymentsChoice, AnimatedIcon>> = {
  razorpay: WalletIcon,
  stripe: CreditCardIcon,
};

const PAYMENT_STATIC: Partial<Record<PaymentsChoice, LucideIcon>> = {
  manual: Building2,
  skip: SkipForward,
};

const OPTION_SELECTED = "border-brand-core bg-brand-core/10 dark:bg-brand-core/15";
const OPTION_IDLE = "border-border/80 bg-background/60 hover:border-brand-core/40";
const OPTION_LABEL_SELECTED = "text-brand-deep dark:text-brand-bright";

type OptionChipProps = {
  selected: boolean;
  label: string;
  description?: string;
  Animated?: AnimatedIcon;
  Static?: LucideIcon;
  onSelect: () => void;
  layout?: "stack" | "row";
};

const OptionChip = memo(function OptionChip({
  selected,
  label,
  description,
  Animated,
  Static,
  onSelect,
  layout = "stack",
}: OptionChipProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleClick(_e: MouseEvent<HTMLButtonElement>) {
    onSelect();
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={handleClick}
      {...hoverHandlers}
      className={cn(
        "min-h-10 rounded-lg border text-left transition-colors press-scale",
        layout === "stack" ? "flex flex-col gap-1 p-2.5" : "flex items-center gap-2 p-2.5",
        selected ? OPTION_SELECTED : OPTION_IDLE,
      )}
    >
      {Animated ? (
        <Animated
          ref={iconRef as Ref<IconHandle>}
          size={14}
          className={cn("shrink-0", selected ? "text-brand-core" : "text-muted-foreground")}
        />
      ) : Static ? (
        <Static
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            selected ? "text-brand-core" : "text-muted-foreground",
          )}
          aria-hidden
        />
      ) : (
        <BoxesIcon
          ref={iconRef as Ref<IconHandle>}
          size={14}
          className={cn("shrink-0", selected ? "text-brand-core" : "text-muted-foreground")}
        />
      )}
      <span
        className={cn(
          "text-xs font-medium",
          selected ? OPTION_LABEL_SELECTED : "text-foreground",
        )}
      >
        {label}
      </span>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </button>
  );
});

export function StepSetup({
  data,
  recommendedReasons,
  onToggleModule,
  patch,
  onBack,
  onNext,
}: StepSetupProps) {
  const showPayments = needsPaymentsStep(data.goals);

  const handleStartingData = useCallback(
    (id: StartingDataChoice) => {
      patch({ startingData: id });
    },
    [patch],
  );

  const handlePayments = useCallback(
    (id: PaymentsChoice) => {
      patch({ paymentsChoice: id });
    },
    [patch],
  );

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <p className="text-[13px] font-semibold text-foreground">Recommended modules</p>
        <div className="space-y-1.5">
          {Object.entries(MODULE_CATALOG).map(([key, meta]) => {
            const selected = data.modules.includes(key);
            const reason = recommendedReasons?.[key];
            return (
              <ModuleRow
                key={key}
                moduleKey={key}
                label={meta.label}
                description={reason ?? meta.description ?? ""}
                selected={selected}
                onToggle={onToggleModule}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[13px] font-semibold text-foreground">Starting data</p>
        <div role="group" aria-label="Starting data" className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {STARTING_DATA_OPTIONS.map((option) => (
            <OptionChip
              key={option.id}
              selected={data.startingData === option.id}
              label={option.label}
              description={option.description}
              Animated={STARTING_DATA_ANIMATED[option.id]}
              Static={STARTING_DATA_STATIC[option.id]}
              onSelect={() => handleStartingData(option.id)}
            />
          ))}
        </div>
      </section>

      {showPayments && (
        <section className="space-y-2">
          <p className="text-[13px] font-semibold text-foreground">Payments</p>
          <p className="text-xs text-muted-foreground">
            Connect a provider now, or skip and do it later from Settings.
          </p>
          <div
            role="group"
            aria-label="Payments"
            className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
          >
            {PAYMENT_PROVIDER_OPTIONS.map((option) => (
              <OptionChip
                key={option.id}
                selected={data.paymentsChoice === option.id}
                label={option.label}
                Animated={PAYMENT_ANIMATED[option.id]}
                Static={PAYMENT_STATIC[option.id]}
                layout="row"
                onSelect={() => handlePayments(option.id)}
              />
            ))}
          </div>
        </section>
      )}

      {data.modules.length === 0 && (
        <p role="alert" className="text-xs text-destructive">
          Turn on at least one module to continue.
        </p>
      )}

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={data.modules.length === 0} />
    </div>
  );
}
