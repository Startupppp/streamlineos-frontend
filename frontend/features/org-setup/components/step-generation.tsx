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
const MAX_BULK_INVITES = 500;

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
  return Array.from(byRole.entries()).flatMap(([role, emails]) => {
    const groups: { role: string; emails: string[] }[] = [];
    for (let index = 0; index < emails.length; index += MAX_BULK_INVITES) {
      groups.push({ role, emails: emails.slice(index, index + MAX_BULK_INVITES) });
    }
    return groups;
  });
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

    setShowWelcome(true);
  }

  async function runPostSetupTasks(payload: OrgSetupPayload, invitees: Invitee[]) {
    const generation = generateWorkspaceRef.current
      .mutateAsync({
        industry: payload.industry,
        enabledModules: payload.enabledModules,
      })
      .then(() => null)
      .catch((error: unknown) => getErrorMessage(error));

    const invitationRequests = groupInviteesByRole(invitees).map((group) =>
      bulkInviteRef.current.mutateAsync(group),
    );
    const [generationFailure, inviteResults] = await Promise.all([
      generation,
      Promise.all(invitationRequests),
    ]);

    if (generationFailure) {
      toast.warning(
        `Your workspace is ready, but starter content could not be generated: ${generationFailure}`,
      );
    }

    const failedInvites = inviteResults.flatMap((result) =>
      result.results.filter((item) => !item.success),
    );
    if (failedInvites.length > 0) {
      toast.warning(
        `${failedInvites.length} invitation${failedInvites.length === 1 ? "" : "s"} could not be queued. You can retry them from People.`,
      );
    } else if (invitees.length > 0) {
      toast.success(
        `${invitees.length} invitation${invitees.length === 1 ? "" : "s"} queued in the background.`,
      );
    }
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

      await handleSuccess(res?.autoLoginToken ?? null, res.orgId);
      void runPostSetupTasks(payload, dataRef.current.invitees).catch(
        (error: unknown) => {
          toast.warning(
            `Your workspace is ready, but some background setup work failed: ${getErrorMessage(error)}`,
          );
        },
      );
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
