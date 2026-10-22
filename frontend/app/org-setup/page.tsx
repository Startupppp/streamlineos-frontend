"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { setAutoSignOutSuppressed } from "@/lib/api-client";
import {
  useOrgSetupSessionQuery,
  useOrgSetupDraftQuery,
  useOrgSetupDraftSaveMutation,
} from "@/hooks/api/org-setup";
import {
  DEFAULT_DATA,
  getStepSequence,
  type StepId,
} from "@/features/org-setup/lib/constants";
import {
  loadDraft,
  saveDraft,
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
import { StepInviteLaunch } from "@/features/org-setup/components/step-invite-launch";
import { OrgSetupLoading } from "@/features/org-setup/components/org-setup-loading";
import { ORG_MODULE_KEYS } from "@/hooks/api/org-setup-schema";
import { ArchivedOrgsRestore } from "@/components/organization/archived-orgs-restore";
import {
  useMyPendingInvitations,
  useClaimInvitation,
  useSignOut,
  signInWithMagicToken,
} from "@/hooks/common/auth-hooks";
import { persistPartialGrants } from "@/features/auth/components/post-invite-transition";
import type { PendingInvitationItem } from "@/hooks/common/auth-schema";

function PendingInvitationsNotice({ items }: { items: PendingInvitationItem[] }) {
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const claimMutation = useClaimInvitation();
  if (items.length === 0) return null;

  function handleJoin(invitationId: string) {
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
  }

  function handleJoinClick(event: React.MouseEvent<HTMLButtonElement>) {
    const invitationId = event.currentTarget.dataset.invitationId;
    if (invitationId) handleJoin(invitationId);
  }

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
            data-invitation-id={item.id}
            disabled={!!joiningId}
            onClick={handleJoinClick}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {joiningId === item.id ? "Joining…" : "Join"}
          </button>
        </div>
      ))}
    </div>
  );
}

const sequence = getStepSequence();

function prepareDraftForSimplifiedSetup(draft: WizardData): WizardData {
  return {
    ...draft,
    companyName: "",
    goals: [],
    installedApps: [],
    region: undefined,
    modules: [...ORG_MODULE_KEYS],
    // The invitation step remains available, so keep saved invitees for review.
    moduleAnswers: {},
  };
}

export default function OrgSetupPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";

  const [stepIndex, setStepIndex] = useState(0);
  const currentStepId: StepId = sequence[stepIndex] ?? "workspace";
  const [mounted, setMounted] = useState(false);
  const [createOwnOrg, setCreateOwnOrg] = useState(false);
  const [data, setData] = useState<WizardData>({ ...DEFAULT_DATA });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const mountedOnceRef = useRef(false);
  const draftRevisionRef = useRef(0);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSaveChainRef = useRef<Promise<void>>(Promise.resolve());
  const latestDraftRef = useRef<{ data: WizardData; stepId: StepId } | null>(null);
  const savedDraftRef = useRef<{ data: WizardData; stepId: StepId } | null>(null);

  const { data: pendingInvitations, isPending: isInvitationsPending } =
    useMyPendingInvitations(Boolean(userId));

  const { data: serverSession, isFetched: isServerSessionFetched } =
    useOrgSetupSessionQuery(Boolean(userId));
  const { data: serverDraft, isFetched: isServerDraftFetched } =
    useOrgSetupDraftQuery(Boolean(userId));
  const { mutateAsync: saveOrgSetupDraft } = useOrgSetupDraftSaveMutation();

  const persistLatestDraft = useCallback((): Promise<void> => {
    const target = latestDraftRef.current;
    if (!userId || !target || target === savedDraftRef.current) {
      return draftSaveChainRef.current;
    }
    setSyncStatus("saving");
    const save = draftSaveChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const latest = target;
        if (latest === savedDraftRef.current) return;
        const result = await saveOrgSetupDraft({
          revision: draftRevisionRef.current,
          stepData: {
            ...latest.data,
            __schemaVersion: 1,
            __currentStep: latest.stepId,
          },
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        draftRevisionRef.current = result.revision;
        savedDraftRef.current = latest;
      });
    draftSaveChainRef.current = save;
    save.then(
      () => {
        if (draftSaveChainRef.current === save) setSyncStatus("synced");
      },
      () => {
        if (draftSaveChainRef.current === save) setSyncStatus("error");
      },
    );
    return save;
  }, [saveOrgSetupDraft, userId]);

  const retryDraftSave = useCallback(() => {
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
    void persistLatestDraft().catch(() => undefined);
  }, [persistLatestDraft]);

  const scheduleServerDraftSave = useCallback(
    (nextData: WizardData, nextStepId: StepId) => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
      latestDraftRef.current = { data: nextData, stepId: nextStepId };
      setSyncStatus("unsynced");
      draftSaveTimerRef.current = setTimeout(() => {
        draftSaveTimerRef.current = null;
        void persistLatestDraft().catch(() => undefined);
      }, 500);
    },
    [persistLatestDraft],
  );

  const patch = useCallback(
    (updates: Partial<WizardData>) => {
      setData((prev) => {
        const next = { ...prev, ...updates };
        saveDraft(next, userId);
        scheduleServerDraftSave(next, currentStepId);
        return next;
      });
    },
    [currentStepId, scheduleServerDraftSave, userId],
  );

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
    const hydrated = prepareDraftForSimplifiedSetup(
      sessionName && !baseDraft.fullName.trim()
        ? { ...baseDraft, fullName: sessionName }
        : baseDraft,
    );
    draftRevisionRef.current = serverDraft?.revision ?? 0;
    setData(hydrated);
    saveDraft(hydrated, userId);
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

  const handleCreateOwnOrg = useCallback(() => setCreateOwnOrg(true), []);
  const signOutMutation = useSignOut();
  const handleSignOut = useCallback(() => {
    signOutMutation.mutate();
  }, [signOutMutation]);

  if (mounted && !createOwnOrg && !isInvitationsPending && (pendingInvitations?.length ?? 0) > 0) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12 sm:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">You have a pending invitation</h1>
          <p className="text-sm text-muted-foreground">
            Join an organization below to get started.
          </p>
        </div>
        <PendingInvitationsNotice items={pendingInvitations ?? []} />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" className="self-start" onClick={handleCreateOwnOrg}>
            Create my own organization instead
          </Button>
          <LoadingButton
            type="button"
            variant="ghost"
            className="self-start text-muted-foreground"
            onClick={handleSignOut}
            isPending={signOutMutation.isPending}
            loadingText="Signing out…"
          >
            Sign out
          </LoadingButton>
        </div>
      </div>
    );
  }

  if (!mounted)
    return <OrgSetupLoading />;

  return (
    <OrgSetupShell
      sequence={sequence}
      currentIndex={stepIndex}
      title={stepIndex === 0 ? "Workspace" : "Invite your team"}
      direction={1}
      syncStatus={syncStatus}
      data={data}
      onRetrySave={retryDraftSave}
    >
      {stepIndex === 0 ? (
        <StepWorkspace
          data={data}
          patch={patch}
          onNext={() => {
            setStepIndex(1);
            scheduleServerDraftSave(data, "invite");
          }}
          restoreSlot={
            <>
              <ArchivedOrgsRestore />
              <PendingInvitationsNotice items={pendingInvitations ?? []} />
            </>
          }
        />
      ) : (
        <StepInviteLaunch
          data={data}
          onBack={() => {
            setStepIndex(0);
            scheduleServerDraftSave(data, "workspace");
          }}
          onChangeInvitees={(invitees) => patch({ invitees })}
        />
      )}
    </OrgSetupShell>
  );
}
