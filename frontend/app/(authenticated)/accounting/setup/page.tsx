"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { useSetupStatus } from "@/hooks/api/accounting/fin-settings";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  StepCompanyCurrency,
  StepTaxRegistration,
  StepChartOfAccounts,
  StepSystemAccounts,
  StepPeriods,
  StepOpeningBalances,
} from "@/features/accounting/settings/setup-wizard-steps";

const WIZARD_STEPS = [
  { key: "company_currency", label: "Company & Currency" },
  { key: "tax_registration", label: "Tax Registration" },
  { key: "coa", label: "Chart of Accounts" },
  { key: "system_accounts", label: "System Accounts" },
  { key: "periods", label: "Periods" },
  { key: "opening_balances", label: "Opening Balances" },
] as const;

const slideVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

const slideTransition = { duration: 0.22, ease: "easeOut" as const };

function parseStep(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > WIZARD_STEPS.length + 1) return 1;
  return n;
}

interface StepRailProps {
  currentStep: number;
  doneKeys: Set<string>;
  onStepClick: (step: number) => void;
}

function StepRail({ currentStep, doneKeys, onStepClick }: StepRailProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap mb-6">
      {WIZARD_STEPS.map((s, idx) => {
        const stepNum = idx + 1;
        const isDone = doneKeys.has(s.key);
        const isActive = currentStep === stepNum;

        function handleClick(): void {
          onStepClick(stepNum);
        }

        return (
          <button
            key={s.key}
            type="button"
            onClick={handleClick}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              isActive && "bg-primary text-primary-foreground",
              !isActive && isDone && "bg-status-success-surface text-status-success-ink border border-status-success-rule",
              !isActive && !isDone && "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {isDone ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{stepNum}. {s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FinishedScreen() {
  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center py-16">
      <div className="flex flex-col items-center text-center px-6 max-w-md mx-auto">
        <div className="rounded-full bg-status-success-surface border border-status-success-rule p-4 mb-5">
          <CheckCircle2 className="h-10 w-10 text-status-success-ink" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Setup complete!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your accounting module is ready to use. You can always adjust settings later.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/accounting">Go to Accounting Overview</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/accounting/settings">Review Settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AccountingSetupPage() {
  const canManage = useCan("accounting:settings:manage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setupStatusQuery = useSetupStatus();

  const currentStep = parseStep(searchParams.get("step"));
  const isFinished = currentStep > WIZARD_STEPS.length;

  const doneKeys = new Set(
    (setupStatusQuery.data?.steps ?? [])
      .filter((s) => s.done)
      .map((s) => s.key),
  );

  const invalidateSetupStatus = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...queryKeys.accounting.all, "fin-settings", "setup-status"],
    });
  }, [queryClient]);

  function navigateTo(step: number): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(step));
    router.replace(`/accounting/setup?${params.toString()}`);
  }

  function handleStepComplete(): void {
    invalidateSetupStatus();
    navigateTo(currentStep + 1);
  }

  function handleSkip(): void {
    navigateTo(currentStep + 1);
  }

  function handleStepClick(step: number): void {
    navigateTo(step);
  }

  if (!canManage) {
    return (
      <PageWrapper title="Accounting Setup" subtitle="Configure your accounting module">
        <div className="flex flex-1 min-h-0 flex-col">
          <EmptyState
            title="Insufficient permissions"
            description="You need the accounting:settings:manage permission to access the setup wizard."
          />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Accounting Setup"
      subtitle="Complete these steps to get your accounting module ready"
      backHref="/accounting/settings"
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <StepRail
          currentStep={currentStep}
          doneKeys={doneKeys}
          onStepClick={handleStepClick}
        />

        <AnimatePresence mode="wait">
          {isFinished ? (
            <motion.div
              key="finished"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={slideTransition}
            >
              <FinishedScreen />
            </motion.div>
          ) : currentStep === 1 ? (
            <motion.div
              key="step-1"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={slideTransition}
            >
              <StepCompanyCurrency onComplete={handleStepComplete} onSkip={handleSkip} />
            </motion.div>
          ) : currentStep === 2 ? (
            <motion.div
              key="step-2"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={slideTransition}
            >
              <StepTaxRegistration onComplete={handleStepComplete} onSkip={handleSkip} />
            </motion.div>
          ) : currentStep === 3 ? (
            <motion.div
              key="step-3"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={slideTransition}
            >
              <StepChartOfAccounts onComplete={handleStepComplete} onSkip={handleSkip} />
            </motion.div>
          ) : currentStep === 4 ? (
            <motion.div
              key="step-4"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={slideTransition}
            >
              <StepSystemAccounts onComplete={handleStepComplete} onSkip={handleSkip} />
            </motion.div>
          ) : currentStep === 5 ? (
            <motion.div
              key="step-5"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={slideTransition}
            >
              <StepPeriods onComplete={handleStepComplete} onSkip={handleSkip} />
            </motion.div>
          ) : (
            <motion.div
              key="step-6"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={slideTransition}
            >
              <StepOpeningBalances onComplete={handleStepComplete} onSkip={handleSkip} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
