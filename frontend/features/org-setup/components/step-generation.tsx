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
import type { Invitee, WizardData } from "../lib/types";
import {
  DEFAULT_APPS,
  GENERATION_STEPS,
  WELCOME_POP_KEY,
  WELCOME_POP_NAME_KEY,
} from "../lib/constants";
import { GenerationProgressStage } from "./generation-progress-stage";
import { WelcomeCelebration } from "./welcome-celebration";

const SETUP_DONE_KEY = "org-setup-complete";

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
  const { update } = useSession();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
      industry: d.industry || "IT Services",
      companyName: d.companyName,
      companySize: d.teamSize || "1-10",
      ...(d.country ? { country: d.country } : {}),
      ...(d.timezone ? { timezone: d.timezone } : {}),
      phone: d.phone,
      enabledModules: d.modules.length > 0 ? d.modules : [...DEFAULT_APPS],
    };
  }

  const goToWorkspace = useCallback(() => {
    if (isContinuing) return;
    setIsContinuing(true);
    clearAll();
    window.location.replace("/dashboard");
  }, [isContinuing]);

  async function handleSuccess(autoLoginToken: string | null) {
    if (apiDoneRef.current) return;
    apiDoneRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCompletedSteps(total);
    clearBackendTokenCache();
    clearAll();
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
    await completeOnboardingGate("org-setup-done", update);

    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    setShowWelcome(true);
  }

  function handleError(msg: string) {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    hasRunRef.current = false;
    sessionStorage.removeItem(SETUP_DONE_KEY);
    setError(msg);
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

  async function runSetup() {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    setCompletedSteps(0);
    setError(null);
    startAnimation();

    const payload = buildPayload(dataRef.current);

    try {
      const res = await completeOrgSetupRef.current.mutateAsync(payload);
      clearBackendTokenCache();

      await generateWorkspaceRef.current
        .mutateAsync({
          industry: payload.industry,
          enabledModules: payload.enabledModules,
        })
        .catch(() => null);

      const inviteGroups = groupInviteesByRole(dataRef.current.invitees);
      for (const group of inviteGroups) {
        await bulkInviteRef.current.mutateAsync(group).catch(() => null);
      }

      await handleSuccess(res?.autoLoginToken ?? null);
    } catch (err) {
      handleError(getErrorMessage(err));
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
    <>
      <GenerationProgressStage
        steps={generationSteps}
        completedSteps={completedSteps}
        progress={progress}
        companyName={companyName}
        error={error}
        showWelcome={showWelcome}
        onRetry={runSetup}
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
    </>
  );
}
