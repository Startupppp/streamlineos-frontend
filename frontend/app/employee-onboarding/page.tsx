"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useOnboardingSessionQuery,
  usePatchOnboardingSessionMutation,
} from "@/hooks/api/onboarding-flow";
import {
  useBankDetailsQuery,
  usePersonalDetailsQuery,
} from "@/lib/api/hooks/onboarding";
import { EmployeeOnboardingShell } from "@/features/employee-onboarding/components/employee-onboarding-shell";
import { StepPersonal } from "@/features/employee-onboarding/components/step-personal";
import { StepBank } from "@/features/employee-onboarding/components/step-bank";
import { StepReview } from "@/features/employee-onboarding/components/step-review";
import {
  DATA_STEP_IDS,
  ONBOARDING_SEQUENCE,
  STEP_IDS,
  STEP_TITLES,
  isStepId,
  stepIndexOf,
  type StepId,
} from "@/features/employee-onboarding/lib/constants";
import { toPreviewSnapshot } from "@/features/employee-onboarding/lib/preview-snapshot";
import { countryNameToCode } from "@/features/employee-onboarding/lib/onboarding-requirements-schema";
import {
  EMPTY_BANK_DRAFT,
  EMPTY_PERSONAL_DRAFT,
  EMPTY_WIZARD_DRAFT,
  bankDraftHasPrefill,
  mergeBankDraft,
  mergePersonalDraft,
  parseWizardDraft,
  personalDraftHasPrefill,
  type BankDraft,
  type PersonalDraft,
  type WizardDraft,
} from "@/features/employee-onboarding/lib/wizard-draft-schema";

const ROLE_LABELS: Record<string, string> = {
  FINAL: "FINAL",
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

const DRAFT_PERSIST_MS = 600;

function draftPayload(draft: WizardDraft): Record<string, unknown> {
  return {
    personal: draft.personal,
    bank: draft.bank,
  };
}

function resolveStepFromSession(
  currentStep: string | null | undefined,
): StepId {
  if (currentStep && isStepId(currentStep)) return currentStep;
  if (currentStep === "docs") return STEP_IDS.REVIEW;
  return STEP_IDS.PERSONAL;
}

export default function EmployeeOnboardingPage() {
  const { data: authSession } = useSession();
  const [direction, setDirection] = useState(1);
  const [localDraft, setLocalDraft] = useState<WizardDraft | null>(null);
  const [localStep, setLocalStep] = useState<StepId | null>(null);
  const [localCompleted, setLocalCompleted] =
    useState<ReadonlySet<string> | null>(null);
  const [saveState, setSaveState] =
    useState<"idle" | "saving" | "saved" | "error">("idle");
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSequenceRef = useRef(0);

  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useOnboardingSessionQuery();
  const { mutateAsync: patchSession } = usePatchOnboardingSessionMutation();
  const {
    data: personalDetails,
    error: personalDetailsError,
    isLoading: personalDetailsLoading,
    refetch: refetchPersonalDetails,
  } = usePersonalDetailsQuery();
  const {
    data: bankDetails,
    error: bankDetailsError,
    isLoading: bankDetailsLoading,
    refetch: refetchBankDetails,
  } = useBankDetailsQuery();

  const sessionDraft = useMemo(
    () => (session ? parseWizardDraft(session.data) : EMPTY_WIZARD_DRAFT),
    [session],
  );

  const sessionCompleted = useMemo(
    () => new Set(session?.completedSteps ?? []),
    [session],
  );

  const sessionStep = useMemo(
    () => resolveStepFromSession(session?.currentStep),
    [session],
  );

  const personalPrefill = useMemo((): PersonalDraft => {
    if (!personalDetails) return EMPTY_PERSONAL_DRAFT;
    return {
      ...EMPTY_PERSONAL_DRAFT,
      phone: personalDetails.phone ?? "",
      gender: personalDetails.gender ?? "",
      dateOfBirth: personalDetails.dateOfBirth ?? "",
      addressLine1: personalDetails.addressLine1 ?? "",
      addressCity: personalDetails.addressCity ?? "",
      addressState: personalDetails.addressState ?? "",
      addressPostalCode: personalDetails.addressPostalCode ?? "",
      addressCountry:
        personalDetails.addressCountry ?? EMPTY_PERSONAL_DRAFT.addressCountry,
      emergencyName: personalDetails.emergencyName ?? "",
      emergencyRelation: personalDetails.emergencyRelation ?? "",
      emergencyPhone: personalDetails.emergencyPhone ?? "",
    };
  }, [personalDetails]);

  const bankPrefill = useMemo((): BankDraft => {
    if (!bankDetails) return EMPTY_BANK_DRAFT;
    return {
      countryCode: bankDetails.countryCode,
      accountHolder: bankDetails.accountHolder,
      bankName: bankDetails.bankName,
      accountNumber: bankDetails.accountNumber,
      routingCode: bankDetails.routingCode,
      iban: bankDetails.iban,
      swift: bankDetails.swift,
      statutory: bankDetails.statutory,
    };
  }, [bankDetails]);

  const wizardDraft = useMemo(() => {
    if (localDraft) return localDraft;
    return {
      personal: mergePersonalDraft(sessionDraft.personal, personalPrefill),
      bank: mergeBankDraft(sessionDraft.bank, bankPrefill),
    };
  }, [localDraft, sessionDraft, personalPrefill, bankPrefill]);

  const hasPersonalPrefill = personalDraftHasPrefill(personalPrefill);
  const hasBankPrefill = bankDraftHasPrefill(bankPrefill);

  const completedSteps = localCompleted ?? sessionCompleted;
  const activeTab = localStep ?? sessionStep;

  const draftRef = useRef(wizardDraft);
  useEffect(() => {
    draftRef.current = wizardDraft;
  }, [wizardDraft]);

  const persistDraft = useCallback(
    async (
      next: WizardDraft,
      extras?: { currentStep?: string; completedSteps?: string[] },
      notifyOnError = false,
    ): Promise<boolean> => {
      const sequence = ++persistSequenceRef.current;
      setSaveState("saving");
      try {
        await patchSession({ data: draftPayload(next), ...extras });
        if (sequence === persistSequenceRef.current) setSaveState("saved");
        return true;
      } catch (error) {
        if (sequence === persistSequenceRef.current) setSaveState("error");
        if (notifyOnError) {
          toast.error("Your changes were not saved", {
            id: "onboarding-save-error",
            description: getErrorMessage(error),
          });
        }
        return false;
      }
    },
    [patchSession],
  );

  const flushPersist = useCallback(
    async (
      next: WizardDraft,
      extras?: { currentStep?: string; completedSteps?: string[] },
    ): Promise<boolean> => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      return persistDraft(next, extras, true);
    },
    [persistDraft],
  );

  const schedulePersist = useCallback(
    (next: WizardDraft) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        void persistDraft(next, undefined, true);
      }, DRAFT_PERSIST_MS);
    },
    [persistDraft],
  );

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (saveState !== "saved") return;
    const timeout = setTimeout(() => setSaveState("idle"), 4000);
    return () => clearTimeout(timeout);
  }, [saveState]);

  const identity = useMemo(() => {
    const roleKey = authSession?.user?.role ?? "";
    return {
      displayName: authSession?.user?.name?.trim() ?? "",
      email: authSession?.user?.email?.trim() ?? "",
      roleLabel: ROLE_LABELS[roleKey] ?? roleKey,
    };
  }, [
    authSession?.user?.name,
    authSession?.user?.email,
    authSession?.user?.role,
  ]);

  const previewSnapshot = useMemo(
    () => toPreviewSnapshot(wizardDraft, identity),
    [wizardDraft, identity],
  );

  const countryCode = useMemo(
    () => countryNameToCode(wizardDraft.personal.addressCountry),
    [wizardDraft.personal.addressCountry],
  );

  const currentStepIndex = stepIndexOf(activeTab);

  const navigateTo = useCallback(
    async (id: StepId) => {
      const persisted = await flushPersist(draftRef.current, {
        currentStep: id,
      });
      if (!persisted) return;
      setDirection(stepIndexOf(id) >= stepIndexOf(activeTab) ? 1 : -1);
      setLocalStep(id);
    },
    [activeTab, flushPersist],
  );

  const handlePersonalDraftChange = useCallback(
    (personal: PersonalDraft) => {
      setLocalDraft((prev) => {
        const base = prev ?? draftRef.current;
        const next = { ...base, personal };
        draftRef.current = next;
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist],
  );

  const handleBankDraftChange = useCallback(
    (bank: BankDraft) => {
      setLocalDraft((prev) => {
        const base = prev ?? draftRef.current;
        const next = { ...base, bank };
        draftRef.current = next;
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist],
  );

  const handlePersonalComplete = useCallback(
    async (personal: PersonalDraft) => {
      const nextDraft = { ...draftRef.current, personal };
      draftRef.current = nextDraft;
      setLocalDraft(nextDraft);
      const nextCompleted = new Set(localCompleted ?? sessionCompleted);
      nextCompleted.add(STEP_IDS.PERSONAL);
      const persisted = await flushPersist(nextDraft, {
        currentStep: STEP_IDS.BANK,
        completedSteps: Array.from(nextCompleted),
      });
      if (!persisted) return;
      setLocalCompleted(nextCompleted);
      setDirection(1);
      setLocalStep(STEP_IDS.BANK);
      toast.success("Personal details saved");
    },
    [flushPersist, localCompleted, sessionCompleted],
  );

  const handleBankComplete = useCallback(
    async (bank: BankDraft) => {
      const nextDraft = { ...draftRef.current, bank };
      draftRef.current = nextDraft;
      setLocalDraft(nextDraft);
      const nextCompleted = new Set(localCompleted ?? sessionCompleted);
      nextCompleted.add(STEP_IDS.BANK);
      const persisted = await flushPersist(nextDraft, {
        currentStep: STEP_IDS.REVIEW,
        completedSteps: Array.from(nextCompleted),
      });
      if (!persisted) return;
      setLocalCompleted(nextCompleted);
      setDirection(1);
      setLocalStep(STEP_IDS.REVIEW);
      toast.success("Bank details saved");
    },
    [flushPersist, localCompleted, sessionCompleted],
  );

  const handlePersonalClear = useCallback(() => {
    const nextDraft = {
      ...draftRef.current,
      personal: { ...EMPTY_PERSONAL_DRAFT },
    };
    draftRef.current = nextDraft;
    setLocalDraft(nextDraft);
    const nextCompleted = new Set(localCompleted ?? sessionCompleted);
    nextCompleted.delete(STEP_IDS.PERSONAL);
    setLocalCompleted(nextCompleted);
    flushPersist(nextDraft, {
      currentStep: STEP_IDS.PERSONAL,
      completedSteps: Array.from(nextCompleted),
    });
  }, [flushPersist, localCompleted, sessionCompleted]);

  const handleBankClear = useCallback(() => {
    const nextDraft = {
      ...draftRef.current,
      bank: { ...EMPTY_BANK_DRAFT },
    };
    draftRef.current = nextDraft;
    setLocalDraft(nextDraft);
    const nextCompleted = new Set(localCompleted ?? sessionCompleted);
    nextCompleted.delete(STEP_IDS.BANK);
    setLocalCompleted(nextCompleted);
    flushPersist(nextDraft, {
      currentStep: STEP_IDS.BANK,
      completedSteps: Array.from(nextCompleted),
    });
  }, [flushPersist, localCompleted, sessionCompleted]);

  const handleGoToPersonal = useCallback(
    () => void navigateTo(STEP_IDS.PERSONAL),
    [navigateTo],
  );
  const handleGoToBank = useCallback(
    () => void navigateTo(STEP_IDS.BANK),
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
      void navigateTo(stepId);
    },
    [navigateTo, reachableSteps],
  );

  if (
    (sessionLoading && !session) ||
    personalDetailsLoading ||
    bankDetailsLoading
  ) {
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

  const loadError = sessionError ?? personalDetailsError ?? bankDetailsError;
  if (loadError) {
    const retryLoad = () => {
      void Promise.all([
        refetchSession(),
        refetchPersonalDetails(),
        refetchBankDetails(),
      ]);
    };
    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center p-4 sm:p-8">
        <ErrorState
          className="max-w-xl"
          title="Onboarding couldn’t be loaded"
          description={getErrorMessage(loadError)}
          onRetry={retryLoad}
        />
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
      snapshot={previewSnapshot}
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
          onDraftChange={handlePersonalDraftChange}
          onClear={handlePersonalClear}
          defaultValues={wizardDraft.personal}
          hasPrefilledData={hasPersonalPrefill}
        />
      ) : null}
      {activeTab === STEP_IDS.BANK ? (
        <StepBank
          countryCode={countryCode}
          onComplete={handleBankComplete}
          onDraftChange={handleBankDraftChange}
          onClear={handleBankClear}
          onBack={handleGoToPersonal}
          defaultValues={wizardDraft.bank}
          hasPrefilledData={hasBankPrefill}
        />
      ) : null}
      {activeTab === STEP_IDS.REVIEW ? (
        <StepReview
          completedSteps={completedSteps}
          draft={wizardDraft}
          onBack={handleGoToBank}
          onEditPersonal={handleGoToPersonal}
          onEditBank={handleGoToBank}
        />
      ) : null}
    </EmployeeOnboardingShell>
  );
}
