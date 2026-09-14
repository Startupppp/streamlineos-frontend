"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useOnboardingSessionQuery,
  usePatchOnboardingSessionMutation,
} from "@/hooks/api/onboarding-flow";
import {
  useBankDetailsQuery,
  useBankDetailsMutation,
  usePersonalDetailsQuery,
  usePersonalInfoMutation,
  type PersonalDetailsPayload,
} from "@/lib/api/hooks/onboarding";
import {
  DATA_STEP_IDS,
  ONBOARDING_SEQUENCE,
  STEP_IDS,
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
  persistableBankDraft,
  personalDraftHasPrefill,
  type BankDraft,
  type PersonalDraft,
  type WizardDraft,
} from "@/features/employee-onboarding/lib/wizard-draft-schema";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/features/employee-onboarding/lib/draft-storage";

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

function draftPayload(draft: WizardDraft): Record<string, unknown> {
  return { personal: draft.personal, bank: persistableBankDraft(draft.bank) };
}

function resolveStepFromSession(currentStep: string | null | undefined): StepId {
  if (currentStep && isStepId(currentStep)) return currentStep;
  if (currentStep === "docs") return STEP_IDS.REVIEW;
  return STEP_IDS.PERSONAL;
}

function personalDraftToPayload(personal: PersonalDraft): PersonalDetailsPayload {
  return {
    phone: personal.phone,
    dateOfBirth: personal.dateOfBirth,
    emergencyName: personal.emergencyName,
    emergencyRelation: personal.emergencyRelation,
    emergencyPhone: personal.emergencyPhone,
    ...(personal.gender === "MALE" || personal.gender === "FEMALE" || personal.gender === "OTHER"
      ? { gender: personal.gender }
      : {}),
    ...(personal.addressLine1 ? { addressLine1: personal.addressLine1 } : {}),
    ...(personal.addressCity ? { addressCity: personal.addressCity } : {}),
    ...(personal.addressState ? { addressState: personal.addressState } : {}),
    ...(personal.addressPostalCode ? { addressPostalCode: personal.addressPostalCode } : {}),
    ...(personal.addressCountry ? { addressCountry: personal.addressCountry } : {}),
  };
}

export interface OnboardingWizardState {
  isLoading: boolean;
  loadError: unknown;
  refetchAll: () => void;
  activeTab: StepId;
  currentStepIndex: number;
  direction: number;
  saveState: "idle" | "saving" | "saved" | "error";
  completedSteps: ReadonlySet<string>;
  reachableSteps: Set<string>;
  wizardDraft: WizardDraft;
  previewSnapshot: ReturnType<typeof toPreviewSnapshot>;
  countryCode: string;
  hasPersonalPrefill: boolean;
  hasBankPrefill: boolean;
  identity: { displayName: string; email: string; roleLabel: string };
  handlePersonalDraftChange: (personal: PersonalDraft) => void;
  handleBankDraftChange: (bank: BankDraft) => void;
  handlePersonalComplete: (personal: PersonalDraft) => Promise<void>;
  handleBankComplete: (bank: BankDraft) => Promise<void>;
  handlePersonalClear: () => void;
  handleBankClear: () => void;
  handleGoToPersonal: () => void;
  handleGoToBank: () => void;
  handleStepSelect: (index: number) => void;
  clearDraft: () => void;
}

export function useOnboardingWizard(): OnboardingWizardState {
  const { data: authSession } = useSession();
  const [direction, setDirection] = useState(1);
  const [localDraft, setLocalDraft] = useState<WizardDraft | null>(null);
  const [localStep, setLocalStep] = useState<StepId | null>(null);
  const [localCompleted, setLocalCompleted] = useState<ReadonlySet<string> | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const persistSequenceRef = useRef(0);

  const userId = authSession?.user?.id ?? undefined;
  const orgId = authSession?.orgId ?? undefined;

  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useOnboardingSessionQuery();
  const { mutateAsync: patchSession } = usePatchOnboardingSessionMutation();
  const { mutateAsync: savePersonal } = usePersonalInfoMutation();
  const { mutateAsync: saveBank } = useBankDetailsMutation();

  const sessionCompleted = useMemo(() => new Set(session?.completedSteps ?? []), [session]);

  const sessionStep = useMemo(
    () => resolveStepFromSession(session?.currentStep),
    [session],
  );

  const completedSteps = localCompleted ?? sessionCompleted;
  const activeTab = localStep ?? sessionStep;

  const hasReachedBankStep =
    !sessionLoading &&
    Boolean(session) &&
    (activeTab === STEP_IDS.BANK ||
      activeTab === STEP_IDS.REVIEW ||
      completedSteps.has(STEP_IDS.BANK));

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
  } = useBankDetailsQuery({ enabled: hasReachedBankStep });

  const sessionDraft = useMemo(
    () => (session ? parseWizardDraft(session.data) : EMPTY_WIZARD_DRAFT),
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
      countryCode: bankDetails.countryCode ?? EMPTY_BANK_DRAFT.countryCode,
      accountHolder: bankDetails.accountHolder ?? "",
      bankName: bankDetails.bankName ?? "",
      accountNumber: bankDetails.accountNumber ?? "",
      routingCode: bankDetails.routingCode ?? "",
      iban: bankDetails.iban ?? "",
      swift: bankDetails.swift ?? "",
      statutory: bankDetails.statutory ?? {},
    };
  }, [bankDetails]);

  const storedDraft = useMemo(
    () => loadOnboardingDraft(userId, orgId),
    [userId, orgId],
  );

  const wizardDraft = useMemo(() => {
    if (localDraft) return localDraft;
    if (storedDraft) return storedDraft;
    return {
      personal: mergePersonalDraft(sessionDraft.personal, personalPrefill),
      bank: mergeBankDraft(sessionDraft.bank, bankPrefill),
    };
  }, [localDraft, storedDraft, sessionDraft, personalPrefill, bankPrefill]);

  const hasPersonalPrefill = personalDraftHasPrefill(personalPrefill);
  const hasBankPrefill = bankDraftHasPrefill(bankPrefill);

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
      return persistDraft(next, extras, true);
    },
    [persistDraft],
  );

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
  }, [authSession?.user?.name, authSession?.user?.email, authSession?.user?.role]);

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
      const persisted = await flushPersist(draftRef.current, { currentStep: id });
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
        saveOnboardingDraft(next, userId, orgId);
        return next;
      });
    },
    [userId, orgId],
  );

  const handleBankDraftChange = useCallback(
    (bank: BankDraft) => {
      setLocalDraft((prev) => {
        const base = prev ?? draftRef.current;
        const next = { ...base, bank };
        draftRef.current = next;
        saveOnboardingDraft(next, userId, orgId);
        return next;
      });
    },
    [userId, orgId],
  );

  const handlePersonalComplete = useCallback(
    async (personal: PersonalDraft) => {
      const nextDraft = { ...draftRef.current, personal };
      draftRef.current = nextDraft;
      setLocalDraft(nextDraft);
      saveOnboardingDraft(nextDraft, userId, orgId);

      setSaveState("saving");
      try {
        await savePersonal(personalDraftToPayload(personal));
      } catch (error) {
        setSaveState("error");
        toast.error("Personal details could not be saved", {
          id: "onboarding-save-error",
          description: getErrorMessage(error),
        });
        return;
      }

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
    [flushPersist, localCompleted, sessionCompleted, savePersonal, userId, orgId],
  );

  const handleBankComplete = useCallback(
    async (bank: BankDraft) => {
      const nextDraft = { ...draftRef.current, bank };
      draftRef.current = nextDraft;
      setLocalDraft(nextDraft);
      saveOnboardingDraft(nextDraft, userId, orgId);

      setSaveState("saving");
      try {
        await saveBank(bank);
      } catch (error) {
        setSaveState("error");
        toast.error("Bank details could not be saved", {
          id: "onboarding-save-error",
          description: getErrorMessage(error),
        });
        return;
      }

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
    [flushPersist, localCompleted, sessionCompleted, saveBank, userId, orgId],
  );

  const handlePersonalClear = useCallback(() => {
    const nextDraft = { ...draftRef.current, personal: { ...EMPTY_PERSONAL_DRAFT } };
    draftRef.current = nextDraft;
    setLocalDraft(nextDraft);
    saveOnboardingDraft(nextDraft, userId, orgId);
    const nextCompleted = new Set(localCompleted ?? sessionCompleted);
    nextCompleted.delete(STEP_IDS.PERSONAL);
    setLocalCompleted(nextCompleted);
    flushPersist(nextDraft, {
      currentStep: STEP_IDS.PERSONAL,
      completedSteps: Array.from(nextCompleted),
    });
  }, [flushPersist, localCompleted, sessionCompleted, userId, orgId]);

  const handleBankClear = useCallback(() => {
    const nextDraft = { ...draftRef.current, bank: { ...EMPTY_BANK_DRAFT } };
    draftRef.current = nextDraft;
    setLocalDraft(nextDraft);
    saveOnboardingDraft(nextDraft, userId, orgId);
    const nextCompleted = new Set(localCompleted ?? sessionCompleted);
    nextCompleted.delete(STEP_IDS.BANK);
    setLocalCompleted(nextCompleted);
    flushPersist(nextDraft, {
      currentStep: STEP_IDS.BANK,
      completedSteps: Array.from(nextCompleted),
    });
  }, [flushPersist, localCompleted, sessionCompleted, userId, orgId]);

  const handleGoToPersonal = useCallback(
    () => void navigateTo(STEP_IDS.PERSONAL),
    [navigateTo],
  );
  const handleGoToBank = useCallback(
    () => void navigateTo(STEP_IDS.BANK),
    [navigateTo],
  );

  const reachableSteps = useMemo(() => {
    const firstIncompleteDataStep = DATA_STEP_IDS.find((s) => !completedSteps.has(s));
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

  const clearDraft = useCallback(() => {
    clearOnboardingDraft(userId, orgId);
    setLocalDraft(null);
  }, [userId, orgId]);

  function refetchAll() {
    void Promise.all([refetchSession(), refetchPersonalDetails(), refetchBankDetails()]);
  }

  return {
    isLoading: (sessionLoading && !session) || personalDetailsLoading || bankDetailsLoading,
    loadError: sessionError ?? personalDetailsError ?? bankDetailsError,
    refetchAll,
    activeTab,
    currentStepIndex,
    direction,
    saveState,
    completedSteps,
    reachableSteps,
    wizardDraft,
    previewSnapshot,
    countryCode,
    hasPersonalPrefill,
    hasBankPrefill,
    identity,
    handlePersonalDraftChange,
    handleBankDraftChange,
    handlePersonalComplete,
    handleBankComplete,
    handlePersonalClear,
    handleBankClear,
    handleGoToPersonal,
    handleGoToBank,
    handleStepSelect,
    clearDraft,
  };
}
