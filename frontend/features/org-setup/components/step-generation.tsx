"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import { clearBackendTokenCache } from "@/lib/api-client";
import { completeOnboardingGate } from "@/lib/onboarding-gate";
import { signInWithMagicToken } from "@/hooks/common/auth-hooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { clearAll } from "@/features/org-setup/lib/draft";
import { useCompleteOrgSetupMutation, type OrgSetupPayload } from "@/lib/api/hooks/org";
import { useGenerateWorkspace } from "@/hooks/api/workspace-onboarding";
import { useBulkInviteUsers } from "@/hooks/api/users";
import { WELCOME_POP_KEY, WELCOME_POP_NAME_KEY } from "@/lib/welcome-pop";
import { toast } from "sonner";
import type { Invitee, WizardData } from "../lib/wizard-data-schema";
import { DEFAULT_APPS, GENERATION_STEPS } from "../lib/constants";
import type { SetupError } from "./generation-failure-stage";
import { GenerationProgressStage } from "./generation-progress-stage";
import { WelcomeCelebration } from "./welcome-celebration";

const SETUP_DONE_KEY = "org-setup-complete";

type OrgCreatedResult = {
  autoLoginToken: string | null;
  orgId: string;
};

type GenerationPendingState = {
  industry: string;
  enabledModules: string[];
  failureMessage: string;
};

type StepGenerationProps = {
  data: WizardData;
};

function groupInviteesByRole(invitees: Invitee[]): { role: string; emails: string[] }[] {
  const byRole = new Map<string, string[]>();
  for (const invitee of invitees) {
    const emails = byRole.get(invitee.role) ?? [];
    emails.push(invitee.email);
    byRole.set(invitee.role, emails);
  }
  return Array.from(byRole.entries()).map(([role, emails]) => ({ role, emails }));
}

export function StepGeneration({ data }: StepGenerationProps) {
  const { data: session, update } = useSession();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [setupError, setSetupError] = useState<SetupError | null>(null);
  const [orgCreatedResult, setOrgCreatedResult] = useState<OrgCreatedResult | null>(null);
  const [generationPending, setGenerationPending] = useState<GenerationPendingState | null>(null);
  const [isRetryingGeneration, setIsRetryingGeneration] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const dataRef = useRef(data);

  const wantsInvites = data.invitees.length > 0;
  const generationSteps = GENERATION_STEPS.filter((label) => {
    if (label === "Sending invites") return wantsInvites;
    return true;
  });

  const total = generationSteps.length;
  const HOLD_AT = total - 1;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiDoneRef = useRef(false);
  const hasRunRef = useRef(false);

  const generateWorkspace = useGenerateWorkspace();
  const completeOrgSetup = useCompleteOrgSetupMutation();
  const bulkInvite = useBulkInviteUsers();
  const generateWorkspaceRef = useRef(generateWorkspace);
  const completeOrgSetupRef = useRef(completeOrgSetup);
  const bulkInviteRef = useRef(bulkInvite);

  useLayoutEffect(() => {
    dataRef.current = data;
    generateWorkspaceRef.current = generateWorkspace;
    completeOrgSetupRef.current = completeOrgSetup;
    bulkInviteRef.current = bulkInvite;
  });

  function buildPayload(d: WizardData): OrgSetupPayload {
    return {
      industry: d.industry,
      companyName: d.companyName,
      companySize: d.teamSize,
      ...(d.country ? { country: d.country } : {}),
      ...(d.timezone ? { timezone: d.timezone } : {}),
      phone: d.phone,
      enabledModules: d.modules.length > 0 ? d.modules : [...DEFAULT_APPS],
    };
  }

  const goToWorkspace = useCallback(() => {
    if (isContinuing) return;
    setIsContinuing(true);
    clearAll(session?.user?.id ?? "");
    window.location.replace("/dashboard");
  }, [isContinuing, session?.user?.id]);

  async function handleSuccess(autoLoginToken: string | null, orgId: string) {
    if (apiDoneRef.current) return;
    apiDoneRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCompletedSteps(total);
    clearBackendTokenCache();
    const userId = session?.user?.id ?? "";
    clearAll(userId);
    sessionStorage.setItem(SETUP_DONE_KEY, "1");
    try {
      sessionStorage.setItem(WELCOME_POP_KEY, "1");
      const name = dataRef.current.companyName?.trim();
      if (name) sessionStorage.setItem(WELCOME_POP_NAME_KEY, name);
    } catch {
      void 0;
    }

    if (autoLoginToken) {
      await signInWithMagicToken(autoLoginToken);
    }
    await completeOnboardingGate("org-setup-done", orgId, update);

    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    setShowWelcome(true);
  }

  function handleSetupError(err: SetupError) {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    hasRunRef.current = false;
    sessionStorage.removeItem(SETUP_DONE_KEY);
    setSetupError(err);
  }

  function startAnimation() {
    apiDoneRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    let count = 0;
    intervalRef.current = setInterval(() => {
      if (count >= HOLD_AT && !apiDoneRef.current) return;
      count += 1;
      setCompletedSteps(count);
      if (count >= total && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 650);
  }

  async function navigateToPostSetup(destination: string) {
    if (!orgCreatedResult || isContinuing) return;
    setIsContinuing(true);
    const orgResult = orgCreatedResult;
    try {
      clearBackendTokenCache();
      clearAll(session?.user?.id ?? "");
      if (orgResult.autoLoginToken) {
        await signInWithMagicToken(orgResult.autoLoginToken);
      }
      await completeOnboardingGate("org-setup-done", orgResult.orgId, update);
      sessionStorage.setItem(SETUP_DONE_KEY, "1");
      window.location.replace(destination);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setIsContinuing(false);
    }
  }

  function openOrganization() {
    void navigateToPostSetup("/dashboard");
  }

  function goToInvitations() {
    void navigateToPostSetup("/users/invitations");
  }

  async function retryGeneration() {
    if (!generationPending || isRetryingGeneration || !orgCreatedResult) return;
    const pending = generationPending;
    const orgResult = orgCreatedResult;
    setIsRetryingGeneration(true);
    try {
      await generateWorkspaceRef.current.mutateAsync({
        industry: pending.industry,
        enabledModules: pending.enabledModules,
      });
    } catch (err) {
      toast.warning(`Starter content could not be generated: ${getErrorMessage(err)}`);
    } finally {
      setIsRetryingGeneration(false);
      setGenerationPending(null);
    }
    try {
      await handleSuccess(orgResult.autoLoginToken, orgResult.orgId);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleRetryGeneration() {
    void retryGeneration();
  }

  function continueWithoutGeneration() {
    if (!generationPending || !orgCreatedResult) return;
    const orgResult = orgCreatedResult;
    setGenerationPending(null);
    handleSuccess(orgResult.autoLoginToken, orgResult.orgId).catch((err: unknown) => {
      toast.error(getErrorMessage(err));
    });
  }

  async function runSetup() {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    setCompletedSteps(0);
    setSetupError(null);
    setGenerationPending(null);
    startAnimation();

    const payload = buildPayload(dataRef.current);

    try {
      const res = await completeOrgSetupRef.current.mutateAsync(payload);
      clearBackendTokenCache();
      setOrgCreatedResult({ autoLoginToken: res?.autoLoginToken ?? null, orgId: res.orgId });

      let generationFailure: string | null = null;
      await generateWorkspaceRef.current
        .mutateAsync({
          industry: payload.industry,
          enabledModules: payload.enabledModules,
        })
        .catch((err: unknown) => {
          generationFailure = getErrorMessage(err);
          return null;
        });

      const inviteGroups = groupInviteesByRole(dataRef.current.invitees);
      const inviteFailures: string[] = [];
      for (const group of inviteGroups) {
        try {
          const inviteResult = await bulkInviteRef.current.mutateAsync({
            ...group,
            orgId: res?.orgId,
          });
          for (const item of inviteResult.results)
            if (!item.success)
              inviteFailures.push(item.error ? `${item.email}: ${item.error}` : item.email);
        } catch (err) {
          inviteFailures.push(getErrorMessage(err));
        }
      }

      if (inviteFailures.length > 0) {
        if (generationFailure) {
          toast.warning(`Starter content was not generated: ${generationFailure}`);
        }
        const count = inviteFailures.length;
        const detail = inviteFailures.join(" · ");
        handleSetupError({
          kind: "invites-failed",
          message: `Your organization was created, but ${count} invitation${count > 1 ? "s" : ""} could not be sent: ${detail}. Fix the addresses and try again.`,
        });
        return;
      }

      if (generationFailure) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setCompletedSteps(total);
        setGenerationPending({
          industry: payload.industry,
          enabledModules: payload.enabledModules,
          failureMessage: generationFailure,
        });
        return;
      }

      await handleSuccess(res?.autoLoginToken ?? null, res.orgId);
    } catch (err) {
      handleSetupError({ kind: "setup-failed", message: getErrorMessage(err) });
    }
  }

  const runSetupRef = useRef(runSetup);
  useEffect(() => {
    runSetupRef.current = runSetup;
  });

  useEffect(() => {
    if (sessionStorage.getItem(SETUP_DONE_KEY) === "1") {
      window.location.replace("/dashboard");
      return;
    }
    runSetupRef.current();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const progress = Math.round((completedSteps / total) * 100);
  const companyName = data.companyName?.trim();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <GenerationProgressStage
        steps={generationSteps}
        completedSteps={completedSteps}
        progress={progress}
        companyName={companyName}
        setupError={setupError}
        generationPending={generationPending}
        isRetryingGeneration={isRetryingGeneration}
        showWelcome={showWelcome}
        onRetry={runSetup}
        onRetryGeneration={handleRetryGeneration}
        onContinueWithoutGeneration={continueWithoutGeneration}
        onOpenOrganization={orgCreatedResult ? openOrganization : undefined}
        onGoToInvitations={orgCreatedResult ? goToInvitations : undefined}
        isNavigating={isContinuing}
      />

      <AnimatePresence>
        {showWelcome && (
          <WelcomeCelebration
            companyName={companyName}
            onContinue={goToWorkspace}
            isContinuing={isContinuing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
