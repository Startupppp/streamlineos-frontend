"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useOnboardingSessionQuery,
  usePatchOnboardingSessionMutation,
} from "@/hooks/api/onboarding-flow";
import { EmployeeOnboardingShell } from "@/features/onboarding/components/employee-onboarding-shell";
import { StepPersonal } from "@/features/onboarding/components/step-personal";
import { StepBank } from "@/features/onboarding/components/step-bank";
import { StepDocuments } from "@/features/onboarding/components/step-documents";
import { StepReview } from "@/features/onboarding/components/step-review";
import {
  DATA_STEP_IDS,
  ONBOARDING_SEQUENCE,
  STEP_IDS,
  STEP_TITLES,
  isStepId,
  stepIndexOf,
  type StepId,
} from "@/features/onboarding/lib/constants";

type FormValues = Record<string, string | undefined>;

const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO",
  ADMIN: "Admin",
  HR: "Human Resources",
  ENGINEERING: "Engineering",
  SALES: "Sales",
  DIGITAL_MARKETING: "Digital Marketing",
  FINANCE: "Finance",
  OPERATIONS: "Operations",
  BRANCH_MANAGER: "Branch Manager",
  BRANCH_HR: "Branch HR",
  CUSTOMER_SUPPORT: "Customer Support",
  DESIGN: "Design",
  VIDEO_EDITOR: "Video Editor",
};

export default function EmployeeOnboardingPage() {
  const { data: authSession } = useSession();
  const [activeTab, setActiveTab] = useState<StepId>(STEP_IDS.PERSONAL);
  const [direction, setDirection] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [savedFormData, setSavedFormData] = useState<
    Record<string, FormValues>
  >({});
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const hydratedRef = useRef(false);

  const { data: session, isLoading: sessionLoading } =
    useOnboardingSessionQuery();
  const { mutate: patchSession } = usePatchOnboardingSessionMutation();

  useEffect(() => {
    if (hydratedRef.current || !session) return;
    hydratedRef.current = true;
    if (session.completedSteps?.length) {
      setCompletedSteps(new Set(session.completedSteps));
    }
    if (session.currentStep && isStepId(session.currentStep)) {
      setActiveTab(session.currentStep);
    }
  }, [session]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const timeout = setTimeout(() => setSaveState("idle"), 4000);
    return () => clearTimeout(timeout);
  }, [saveState]);

  const markSaved = useCallback(() => {
    setSaveState("saved");
  }, []);

  const currentStepIndex = stepIndexOf(activeTab);
  const firstName =
    authSession?.user?.name?.split(" ")[0] ??
    authSession?.user?.email?.split("@")[0] ??
    "";
  const roleLabel =
    ROLE_LABELS[authSession?.user?.role ?? ""] ??
    authSession?.user?.role ??
    undefined;

  const navigateTo = useCallback(
    (id: StepId) => {
      setDirection(stepIndexOf(id) >= stepIndexOf(activeTab) ? 1 : -1);
      setActiveTab(id);
    },
    [activeTab],
  );

  const handlePersonalComplete = useCallback(
    (values?: FormValues) => {
      if (values)
        setSavedFormData((prev) => ({ ...prev, [STEP_IDS.PERSONAL]: values }));
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(STEP_IDS.PERSONAL);
        patchSession({
          currentStep: STEP_IDS.BANK,
          completedSteps: Array.from(next),
        });
        return next;
      });
      markSaved();
      setDirection(1);
      setActiveTab(STEP_IDS.BANK);
    },
    [patchSession, markSaved],
  );

  const handleBankComplete = useCallback(
    (values?: FormValues) => {
      if (values)
        setSavedFormData((prev) => ({ ...prev, [STEP_IDS.BANK]: values }));
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(STEP_IDS.BANK);
        patchSession({
          currentStep: STEP_IDS.DOCS,
          completedSteps: Array.from(next),
        });
        return next;
      });
      markSaved();
      setDirection(1);
      setActiveTab(STEP_IDS.DOCS);
    },
    [patchSession, markSaved],
  );

  const handleDocsComplete = useCallback(() => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(STEP_IDS.DOCS);
      patchSession({
        currentStep: STEP_IDS.REVIEW,
        completedSteps: Array.from(next),
      });
      return next;
    });
    markSaved();
    setDirection(1);
    setActiveTab(STEP_IDS.REVIEW);
  }, [patchSession, markSaved]);

  const handleGoToPersonal = useCallback(
    () => navigateTo(STEP_IDS.PERSONAL),
    [navigateTo],
  );
  const handleGoToBank = useCallback(
    () => navigateTo(STEP_IDS.BANK),
    [navigateTo],
  );
  const handleGoToDocs = useCallback(
    () => navigateTo(STEP_IDS.DOCS),
    [navigateTo],
  );

  const reachableSteps = useMemo(() => {
    const firstIncompleteDataStep = DATA_STEP_IDS.find(
      (s) => !completedSteps.has(s),
    );
    const reachable = new Set<string>(completedSteps);
    reachable.add(
      firstIncompleteDataStep ? firstIncompleteDataStep : STEP_IDS.REVIEW,
    );
    reachable.add(activeTab);
    return reachable;
  }, [completedSteps, activeTab]);

  const handleStepSelect = useCallback(
    (index: number) => {
      const stepId = ONBOARDING_SEQUENCE[index];
      if (!stepId || !reachableSteps.has(stepId)) return;
      navigateTo(stepId);
    },
    [navigateTo, reachableSteps],
  );

  if (sessionLoading && !hydratedRef.current) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        <div className="mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col gap-4 px-4 py-6 sm:px-8 md:max-w-none md:w-1/2 md:px-8">
          <Skeleton className="h-8 w-full md:hidden" />
          <Skeleton className="hidden h-6 w-48 md:block" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="hidden h-full w-1/2 shrink-0 flex-col gap-6 border-l border-border/60 p-8 md:flex lg:p-10">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-4 h-72 w-full max-w-[440px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <EmployeeOnboardingShell
      currentIndex={currentStepIndex}
      title={STEP_TITLES[activeTab]}
      direction={direction}
      saveState={saveState}
      completedSteps={completedSteps}
      reachableSteps={reachableSteps}
      firstName={firstName}
      roleLabel={roleLabel}
      onStepSelect={handleStepSelect}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Step ${currentStepIndex + 1} of ${ONBOARDING_SEQUENCE.length}: ${STEP_TITLES[activeTab]}`}
      </div>

      {activeTab === STEP_IDS.PERSONAL ? (
        <StepPersonal
          onComplete={handlePersonalComplete}
          defaultValues={savedFormData[STEP_IDS.PERSONAL]}
        />
      ) : null}
      {activeTab === STEP_IDS.BANK ? (
        <StepBank
          onComplete={handleBankComplete}
          onBack={handleGoToPersonal}
          defaultValues={savedFormData[STEP_IDS.BANK]}
        />
      ) : null}
      {activeTab === STEP_IDS.DOCS ? (
        <StepDocuments
          onComplete={handleDocsComplete}
          onBack={handleGoToBank}
        />
      ) : null}
      {activeTab === STEP_IDS.REVIEW ? (
        <StepReview completedSteps={completedSteps} onBack={handleGoToDocs} />
      ) : null}
    </EmployeeOnboardingShell>
  );
}
