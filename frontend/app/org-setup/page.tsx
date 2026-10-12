"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { setAutoSignOutSuppressed } from "@/lib/api-client";
import {
  useOrgSetupSessionQuery,
  useOrgSetupDraftQuery,
  useOrgSetupDraftSaveMutation,
} from "@/hooks/api/org-setup";
import {
  STEP_TITLES,
  DEFAULT_DATA,
  getStepSequence,
  resolveStepIndex,
  type StepId,
} from "@/features/org-setup/lib/constants";
import {
  loadDraft,
  clearAll,
  saveDraft,
  loadStep,
  saveStep,
  clampStep,
  reachableStep,
  hasCompletionMarker,
  getCompletionDestination,
  type SyncStatus,
} from "@/features/org-setup/lib/draft";
import {
  parseWizardDraft,
  type WizardData,
} from "@/features/org-setup/lib/wizard-data-schema";
import { OrgSetupShell } from "@/features/org-setup/components/org-setup-shell";
import { StepWorkspace } from "@/features/org-setup/components/step-workspace";
import { StepProducts } from "@/features/org-setup/components/step-products";
import { StepInviteLaunch } from "@/features/org-setup/components/step-invite-launch";
import { ArchivedOrgsRestore } from "@/components/organization/archived-orgs-restore";
import {
  useMyPendingInvitations,
  useClaimInvitation,
  signInWithMagicToken,
} from "@/hooks/common/auth-hooks";
import { persistPartialGrants } from "@/features/auth/components/post-invite-transition";
import type { PendingInvitationItem } from "@/hooks/common/auth-schema";

function PendingInvitationsNotice({ items }: { items: PendingInvitationItem[] }) {
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const claimMutation = useClaimInvitation();
  if (items.length === 0) return null;

  const handleJoin = (invitationId: string) => {
    if (joiningId) return;
    setJoiningId(invitationId);
    claimMutation.mutate(invitationId, {
      onSuccess: async (data) => {
        persistPartialGrants(data.skippedGrants ?? []);
        const outcome = await signInWithMagicToken(data.autoLoginToken);
        if (outcome.status === "signed-in") {
          window.location.href = "/post-invite";
        } else {
          toast.error("Could not complete sign-in. Please try again.");
          setJoiningId(null);
        }
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setJoiningId(null);
      },
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-sm font-medium text-foreground">
        {items.length === 1
          ? "You have a pending invitation"
          : `You have ${items.length} pending invitations`}
      </p>
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {item.organizationName} &mdash; {item.role}
          </p>
          <button
            type="button"
            disabled={!!joiningId}
            onClick={() => handleJoin(item.id)}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {joiningId === item.id ? "Joining…" : "Join"}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function OrgSetupPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";

  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<WizardData>({ ...DEFAULT_DATA });

  useEffect(() => {
    if (!mounted) return;
    const sessionName = session?.user?.name?.trim();
    if (!sessionName) return;
    setData((current) =>
      current.fullName.trim() ? current : { ...current, fullName: sessionName },
    );
  }, [mounted, session?.user?.name]);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const mountedOnceRef = useRef(false);
  const draftRevisionRef = useRef(0);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSaveChainRef = useRef<Promise<void>>(Promise.resolve());

  const { data: pendingInvitations } = useMyPendingInvitations(Boolean(userId));

  const { data: serverSession, isFetched: isServerSessionFetched } =
    useOrgSetupSessionQuery(Boolean(userId));
  const { data: serverDraft, isFetched: isServerDraftFetched } =
    useOrgSetupDraftQuery(Boolean(userId));
  const { mutateAsync: saveOrgSetupDraft } = useOrgSetupDraftSaveMutation();

  const sequence = useMemo(() => getStepSequence(), []);
  const totalSteps = sequence.length;
  const currentStepId: StepId = sequence[step - 1] ?? "welcome";

  const markDraftSaved = useCallback(() => {
    setSaveState("saved");
  }, []);

  const saveServerDraft = useCallback(
    (nextData: WizardData, nextStepId: StepId): Promise<void> => {
      if (!userId) return Promise.resolve();
      setSyncStatus("saving");
      const save = draftSaveChainRef.current
        .catch(() => undefined)
        .then(async () => {
          const result = await saveOrgSetupDraft({
            revision: draftRevisionRef.current,
            stepData: {
              ...nextData,
              __schemaVersion: 1,
              __currentStep: nextStepId,
            },
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
          draftRevisionRef.current = result.revision;
          setSyncStatus("synced");
        })
        .catch((error: unknown) => {
          setSyncStatus("error");
          throw error;
        });
      draftSaveChainRef.current = save;
      return save;
    },
    [saveOrgSetupDraft, userId],
  );

  const scheduleServerDraftSave = useCallback(
    (nextData: WizardData, nextStepId: StepId) => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
      setSyncStatus("unsynced");
      draftSaveTimerRef.current = setTimeout(() => {
        draftSaveTimerRef.current = null;
        void saveServerDraft(nextData, nextStepId).catch(() => undefined);
      }, 500);
    },
    [saveServerDraft],
  );

  const patch = useCallback(
    (updates: Partial<WizardData>) => {
      setData((prev) => {
        const next = { ...prev, ...updates };
        saveDraft(next, userId);
        scheduleServerDraftSave(next, currentStepId);
        return next;
      });
      markDraftSaved();
    },
    [currentStepId, markDraftSaved, scheduleServerDraftSave, userId],
  );

  const goNext = useCallback(async () => {
    const nextStep = Math.min(step + 1, totalSteps);
    const nextStepId = sequence[nextStep - 1] ?? currentStepId;
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
    try {
      await saveServerDraft(data, nextStepId);
    } catch (error) {
      toast.error(`We couldn't save your setup. ${getErrorMessage(error)}`);
      return;
    }
    setDirection(1);
    setStep(nextStep);
    markDraftSaved();
  }, [currentStepId, data, markDraftSaved, saveServerDraft, sequence, step, totalSteps]);

  const goBack = useCallback(async () => {
    const nextStep = Math.max(step - 1, 1);
    const nextStepId = sequence[nextStep - 1] ?? currentStepId;
    try {
      await saveServerDraft(data, nextStepId);
    } catch (error) {
      toast.error(`We couldn't save your setup. ${getErrorMessage(error)}`);
      return;
    }
    setDirection(-1);
    setStep(nextStep);
  }, [currentStepId, data, saveServerDraft, sequence, step]);

  const handleStepSelect = useCallback(async (index: number) => {
    const nextStep = index + 1;
    const nextStepId = sequence[index] ?? currentStepId;
    try {
      await saveServerDraft(data, nextStepId);
    } catch (error) {
      toast.error(`We couldn't save your setup. ${getErrorMessage(error)}`);
      return;
    }
    setDirection(-1);
    setStep(nextStep);
  }, [currentStepId, data, saveServerDraft, sequence]);

  useEffect(() => {
    setAutoSignOutSuppressed(true);
    return () => setAutoSignOutSuppressed(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (!hasCompletionMarker(userId, session?.orgId ?? "")) return;
    window.location.replace(
      getCompletionDestination(userId, session?.orgId ?? ""),
    );
  }, [userId, session?.orgId]);

  useEffect(() => {
    if (
      !userId ||
      mountedOnceRef.current ||
      !isServerDraftFetched ||
      !isServerSessionFetched
    )
      return;
    mountedOnceRef.current = true;
    if (hasCompletionMarker(userId, session?.orgId ?? "")) return;
    const savedDraft = loadDraft(userId);
    const rawServerData = serverDraft?.stepData;
    const parsedServerDraft = rawServerData
      ? parseWizardDraft(rawServerData)
      : null;
    const legacyServerDraft =
      !parsedServerDraft &&
      serverSession?.status === "in_progress" &&
      serverSession.data
        ? parseWizardDraft(serverSession.data)
        : null;
    const authoritativeDraft = parsedServerDraft ?? legacyServerDraft;
    const sessionName = session?.user?.name?.trim();
    const baseDraft = authoritativeDraft ?? savedDraft;
    const hydrated =
      sessionName && !baseDraft.fullName.trim()
        ? { ...baseDraft, fullName: sessionName }
        : baseDraft;
    const savedSequence = getStepSequence();
    const serverStepId =
      rawServerData && typeof rawServerData.__currentStep === "string"
        ? rawServerData.__currentStep
        : serverSession?.currentStep;
    const serverStep = resolveStepIndex(serverStepId, savedSequence);
    const restoredStep = reachableStep(
      clampStep(serverStep || loadStep(userId), savedSequence.length),
      hydrated,
      savedSequence,
    );
    draftRevisionRef.current = serverDraft?.revision ?? 0;
    setData(hydrated);
    saveDraft(hydrated, userId);
    setStep(restoredStep);
    saveStep(restoredStep, userId);
    setMounted(true);
  }, [
    isServerDraftFetched,
    isServerSessionFetched,
    serverDraft,
    serverSession,
    session?.orgId,
    session?.user?.name,
    userId,
  ]);

  useEffect(
    () => () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!mounted) return;
    saveStep(step, userId);
  }, [step, mounted, userId]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const timeout = setTimeout(() => setSaveState("idle"), 4000);
    return () => clearTimeout(timeout);
  }, [saveState]);

  if (!mounted)
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

  const stepTitle = STEP_TITLES[currentStepId];

  return (
    <OrgSetupShell
      sequence={sequence}
      currentIndex={step - 1}
      title={stepTitle}
      direction={direction}
      saveState={saveState}
      syncStatus={syncStatus}
      data={data}
      onStepSelect={handleStepSelect}
    >
      {currentStepId === "workspace" && (
        <StepWorkspace
          data={data}
          patch={patch}
          onBack={goBack}
          onNext={goNext}
          isFirstStep
          restoreSlot={
            <>
              <ArchivedOrgsRestore />
              <PendingInvitationsNotice items={pendingInvitations ?? []} />
            </>
          }
        />
      )}
      {currentStepId === "products" && (
        <StepProducts
          data={data}
          patch={patch}
          onBack={goBack}
          onNext={goNext}
        />
      )}
      {currentStepId === "invite" && (
        <StepInviteLaunch
          data={data}
          onBack={goBack}
          onChangeInvitees={(invitees) => patch({ invitees })}
          onSkip={goNext}
        />
      )}
    </OrgSetupShell>
  );
}
