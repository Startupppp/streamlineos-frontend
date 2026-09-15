"use client";

import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import {
  clearBackendTokenCache,
  isApiError,
  setAutoSignOutSuppressed,
} from "@/lib/api-client";
import { clearGateCookie, completeOnboardingGate } from "@/lib/onboarding-gate";
import { signInWithMagicToken } from "@/hooks/common/auth-hooks";
import {
  SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
  useConfirmedSessionClaimsRefresh,
} from "@/hooks/common/use-confirmed-session-claims-refresh";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  clearAll,
  setCompletionMarker,
  hasCompletionMarker,
  clearCompletionMarker,
} from "@/features/org-setup/lib/draft";
import { useCompleteOrgSetupMutation } from "@/lib/api/hooks/org";
import { WELCOME_POP_KEY, WELCOME_POP_NAME_KEY } from "@/lib/welcome-pop";
import { toast } from "sonner";
import type { WizardData } from "../lib/wizard-data-schema";
import { GENERATION_STEPS } from "../lib/constants";
import { buildOrgSetupPayload } from "../lib/setup-payload";
import { useSetupProvisioning } from "../hooks/use-setup-provisioning";
import type { SetupError } from "./generation-failure-stage";
import { GenerationProgressStage } from "./generation-progress-stage";
import { WelcomeCelebration } from "./welcome-celebration";

type OrgCreatedResult = {
  autoLoginToken: string | null;
  orgId: string;
};

type StepGenerationProps = {
  data: WizardData;
};

export function StepGeneration({ data }: StepGenerationProps) {
  const { data: session } = useSession();
  const beginClaimsRefresh = useConfirmedSessionClaimsRefresh();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [setupError, setSetupError] = useState<SetupError | null>(null);
  const [orgCreatedResult, setOrgCreatedResult] =
    useState<OrgCreatedResult | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isPollingAfterTimeout, setIsPollingAfterTimeout] = useState(false);
  const dataRef = useRef(data);
  const sessionRef = useRef(session);

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

  const completeOrgSetup = useCompleteOrgSetupMutation();
  const completeOrgSetupRef = useRef(completeOrgSetup);
  const provisioning = useSetupProvisioning(
    orgCreatedResult !== null || isPollingAfterTimeout,
  );
  const effectiveOrgId =
    orgCreatedResult?.orgId ??
    (isPollingAfterTimeout ? provisioning.orgId : null);
  const effectiveAutoLoginToken = orgCreatedResult?.autoLoginToken ?? null;

  useEffect(() => {
    setAutoSignOutSuppressed(true);
    return () => setAutoSignOutSuppressed(false);
  }, []);

  useLayoutEffect(() => {
    dataRef.current = data;
    sessionRef.current = session;
    completeOrgSetupRef.current = completeOrgSetup;
  });

  const goToWorkspace = useCallback(() => {
    if (isContinuing) return;
    setIsContinuing(true);
    clearAll(session?.user?.id ?? "");
    window.location.replace("/dashboard");
  }, [isContinuing, session?.user?.id]);

  function stopAnimation() {
    if (!intervalRef.current) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  function handleSetupError(err: SetupError) {
    stopAnimation();
    hasRunRef.current = false;
    clearCompletionMarker(
      session?.user?.id ?? "",
      effectiveOrgId ?? session?.orgId ?? "",
    );
    setSetupError(err);
  }

  async function establishOrganizationSession(
    autoLoginToken: string | null,
    orgId: string,
  ): Promise<"confirmed" | "superseded"> {
    const claimsRun = beginClaimsRefresh();
    const claimsOutcome = await completeOnboardingGate(
      "org-setup-done",
      orgId,
      claimsRun.confirm,
      { orgId },
    );
    if (claimsOutcome.status === "confirmed") return "confirmed";
    if (claimsOutcome.status === "superseded") return "superseded";
    if (!autoLoginToken) throw new Error(SESSION_CLAIMS_UNCONFIRMED_MESSAGE);

    const outcome = await signInWithMagicToken(autoLoginToken);
    if (outcome.status === "indeterminate")
      throw new Error(
        "We could not confirm your sign-in. Please sign in again.",
      );
    if (outcome.status !== "signed-in")
      throw new Error("Sign-in failed. Please retry.");
    return "confirmed";
  }

  async function finishSetup(autoLoginToken: string | null, orgId: string) {
    if (apiDoneRef.current) return;
    apiDoneRef.current = true;
    stopAnimation();
    setCompletedSteps(total);
    clearBackendTokenCache();

    try {
      const sessionOutcome = await establishOrganizationSession(
        autoLoginToken,
        orgId,
      );
      if (sessionOutcome === "superseded") return;
    } catch (err) {
      clearGateCookie("org-setup-done", orgId);
      apiDoneRef.current = false;
      handleSetupError({ kind: "setup-failed", message: getErrorMessage(err) });
      return;
    }

    const userId = sessionRef.current?.user?.id ?? "";
    clearAll(userId);
    setCompletionMarker(userId, orgId);
    try {
      sessionStorage.setItem(WELCOME_POP_KEY, "1");
      const name = dataRef.current.companyName?.trim();
      if (name) sessionStorage.setItem(WELCOME_POP_NAME_KEY, name);
    } catch {
      void 0;
    }

    setShowWelcome(true);
  }

  function startAnimation() {
    apiDoneRef.current = false;
    stopAnimation();
    let count = 0;
    intervalRef.current = setInterval(() => {
      if (count >= HOLD_AT && !apiDoneRef.current) return;
      count += 1;
      setCompletedSteps(count);
      if (count >= total) stopAnimation();
    }, 650);
  }

  async function navigateToPostSetup(destination: string) {
    if (!effectiveOrgId || isContinuing || apiDoneRef.current) return;
    setIsContinuing(true);
    apiDoneRef.current = true;
    stopAnimation();
    const orgResult = {
      autoLoginToken: effectiveAutoLoginToken,
      orgId: effectiveOrgId,
    };
    const userId = session?.user?.id ?? "";
    try {
      clearBackendTokenCache();
      const sessionOutcome = await establishOrganizationSession(
        orgResult.autoLoginToken,
        orgResult.orgId,
      );
      if (sessionOutcome === "superseded") return;
      clearAll(userId);
      setCompletionMarker(userId, orgResult.orgId);
      window.location.replace(destination);
    } catch (err) {
      clearGateCookie("org-setup-done", orgResult.orgId);
      apiDoneRef.current = false;
      toast.error(getErrorMessage(err));
      setIsContinuing(false);
    }
  }

  function openOrganization() {
    void navigateToPostSetup("/dashboard");
  }

  function goToInvitations() {
    void navigateToPostSetup("/settings/users?view=invitations");
  }

  function handleRecheckProvisioning() {
    provisioning.recheck();
  }

  function handleContinueAnyway() {
    if (!effectiveOrgId) return;
    void finishSetup(effectiveAutoLoginToken, effectiveOrgId);
  }

  async function runSetup() {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    setCompletedSteps(0);
    setSetupError(null);
    startAnimation();

    try {
      const res = await completeOrgSetupRef.current.mutateAsync(
        buildOrgSetupPayload(dataRef.current),
      );
      clearBackendTokenCache();
      setOrgCreatedResult({
        autoLoginToken: res.autoLoginToken ?? null,
        orgId: res.orgId,
      });
    } catch (err) {
      if (isApiError(err) && err.code === "TIMEOUT") {
        setIsPollingAfterTimeout(true);
      } else {
        handleSetupError({
          kind: "setup-failed",
          message: getErrorMessage(err),
        });
      }
    }
  }

  const runSetupRef = useRef(runSetup);
  const finishSetupRef = useRef(finishSetup);
  useEffect(() => {
    runSetupRef.current = runSetup;
    finishSetupRef.current = finishSetup;
  });

  useEffect(() => {
    const s = sessionRef.current;
    if (hasCompletionMarker(s?.user?.id ?? "", s?.orgId ?? "")) {
      window.location.replace("/dashboard");
      return;
    }
    runSetupRef.current();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!provisioning.isReady || !effectiveOrgId) return;
    finishSetupRef.current(effectiveAutoLoginToken, effectiveOrgId);
  }, [provisioning.isReady, effectiveAutoLoginToken, effectiveOrgId]);

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
        provisioningIssue={provisioning.issue}
        recipientOutcomes={provisioning.recipientOutcomes}
        isRecheckingProvisioning={provisioning.isRechecking}
        showWelcome={showWelcome}
        onRetry={runSetup}
        onRecheckProvisioning={handleRecheckProvisioning}
        onContinueAnyway={handleContinueAnyway}
        onOpenOrganization={effectiveOrgId ? openOrganization : undefined}
        onGoToInvitations={effectiveOrgId ? goToInvitations : undefined}
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
