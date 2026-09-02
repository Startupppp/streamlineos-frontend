"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingState, ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { useSetupStatus } from "@/hooks/api/accounting/fin-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  StepCompanyCurrency,
  StepTaxRegistration,
  StepChartOfAccounts,
  StepSystemAccounts,
  StepPeriods,
  StepOpeningBalances,
} from "@/features/accounting/settings/setup-wizard-steps";

const SETUP_PERMISSION = "accounting:settings:manage";
const PAGE_TITLE = "Accounting Setup";
const PAGE_SUBTITLE = "Complete these steps to get your accounting module ready";

interface StepProps {
  onComplete: () => void;
  onSkip: () => void;
}

const WIZARD_STEPS: ReadonlyArray<{
  key: string;
  label: string;
  Body: (props: StepProps) => React.ReactElement;
}> = [
  { key: "company_currency", label: "Company & Currency", Body: StepCompanyCurrency },
  { key: "tax_registration", label: "Tax Registration", Body: StepTaxRegistration },
  { key: "coa", label: "Chart of Accounts", Body: StepChartOfAccounts },
  { key: "system_accounts", label: "System Accounts", Body: StepSystemAccounts },
  { key: "periods", label: "Periods", Body: StepPeriods },
  { key: "opening_balances", label: "Opening Balances", Body: StepOpeningBalances },
];

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
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              isActive && "bg-primary text-primary-foreground",
              !isActive &&
                isDone &&
                "bg-status-success-surface text-status-success-ink-strong border border-status-success-rule",
              !isActive && !isDone && "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {isDone ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>
              {stepNum}. {s.label}
            </span>
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
          <CheckCircle2
            className="h-10 w-10 text-status-success-ink-strong"
            aria-hidden="true"
          />
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

function SetupShell({ children }: { children: React.ReactNode }) {
  return (
    <PageWrapper
      title={PAGE_TITLE}
      subtitle={PAGE_SUBTITLE}
      backHref="/accounting/settings"
    >
      <div className="flex flex-1 min-h-0 flex-col">{children}</div>
    </PageWrapper>
  );
}

export function AccountingSetupPage() {
  const canManage = useCan(SETUP_PERMISSION);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setupStatusQuery = useSetupStatus();

  const currentStep = parseStep(searchParams.get("step"));
  const isFinished = currentStep > WIZARD_STEPS.length;

  const doneKeys = new Set(
    (setupStatusQuery.data?.steps ?? []).filter((s) => s.done).map((s) => s.key),
  );

  const invalidateSetupStatus = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...queryKeys.accounting.all, "fin-settings", "setup-status"],
    });
  }, [queryClient]);

  const navigateTo = useCallback(
    (step: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(step));
      router.replace(`/accounting/setup?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleStepComplete = useCallback(() => {
    invalidateSetupStatus();
    navigateTo(currentStep + 1);
  }, [currentStep, invalidateSetupStatus, navigateTo]);

  const handleSkip = useCallback(() => {
    navigateTo(currentStep + 1);
  }, [currentStep, navigateTo]);

  const handleSetupStatusRetry = useCallback(() => {
    void setupStatusQuery.refetch();
  }, [setupStatusQuery]);

  if (!canManage)
    return (
      <SetupShell>
        <NoPermissionState
          permission={SETUP_PERMISSION}
          description="You need this permission to run the accounting setup wizard."
        />
      </SetupShell>
    );

  if (setupStatusQuery.isLoading)
    return (
      <SetupShell>
        <LoadingState variant="form" rows={6} />
      </SetupShell>
    );

  if (setupStatusQuery.isError)
    return (
      <SetupShell>
        <ErrorState
          className="flex-1"
          title="Couldn't load your setup progress"
          description={getErrorMessage(setupStatusQuery.error)}
          onRetry={handleSetupStatusRetry}
        />
      </SetupShell>
    );

  const step = WIZARD_STEPS[currentStep - 1];

  return (
    <SetupShell>
      <StepRail
        currentStep={currentStep}
        doneKeys={doneKeys}
        onStepClick={navigateTo}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={isFinished || !step ? "finished" : step.key}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={slideTransition}
        >
          {isFinished || !step ? (
            <FinishedScreen />
          ) : (
            <step.Body onComplete={handleStepComplete} onSkip={handleSkip} />
          )}
        </motion.div>
      </AnimatePresence>
    </SetupShell>
  );
}
