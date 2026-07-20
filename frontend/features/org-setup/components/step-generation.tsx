"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearBackendTokenCache } from "@/lib/api-client";
import { completeOnboardingGate } from "@/lib/onboarding-gate";
import { signInWithMagicToken } from "@/hooks/common/auth-hooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { clearAll } from "@/features/org-setup/lib/draft";
import { useCompleteOrgSetupMutation, type OrgSetupPayload } from "@/lib/api/hooks/org";
import { useGenerateWorkspace } from "@/hooks/api/workspace-onboarding";
import { useBulkInviteUsers } from "@/hooks/api/users";
import type { Invitee, WizardData } from "../lib/types";
import { GENERATION_STEPS } from "../lib/constants";
import { WelcomeCelebration } from "./welcome-celebration";

const SETUP_DONE_KEY = "org-setup-complete";
export const WELCOME_POP_KEY = "org-setup-welcome-pending";
export const WELCOME_POP_NAME_KEY = "org-setup-welcome-name";

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

  const wantsPayments = !!data.paymentsChoice && data.paymentsChoice !== "skip";
  const wantsInvites = data.invitees.length > 0;
  const generationSteps = GENERATION_STEPS.filter((label) => {
    if (label === "Preparing payment setup") return wantsPayments;
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
      enabledModules: d.modules.length > 0 ? d.modules : ["HR", "CRM", "PROJECTS"],
    };
  }

  const goToWorkspace = useCallback(() => {
    if (isContinuing) return;
    setIsContinuing(true);
    clearAll();
    try {
      sessionStorage.setItem(WELCOME_POP_KEY, "1");
      const name = dataRef.current.companyName?.trim();
      if (name) sessionStorage.setItem(WELCOME_POP_NAME_KEY, name);
    } catch {
      void 0;
    }

    const choice = dataRef.current.paymentsChoice;
    if (choice && choice !== "skip") {
      window.location.replace("/settings/payments?from=org-setup");
      return;
    }
    const importFlag = dataRef.current.startingData === "import" ? "?setup=import" : "";
    window.location.replace(`/dashboard${importFlag}`);
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
    sessionStorage.setItem(SETUP_DONE_KEY, "1");

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
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-foreground">
            {companyName ? `Setting up ${companyName}` : "Setting up your workspace"}
          </p>

          <div
            className="h-1 w-full bg-muted rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full gradient-wizard rounded-full transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {completedSteps < total
                ? generationSteps[completedSteps] ?? "Finishing up…"
                : "All done!"}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">{progress}%</p>
          </div>
        </div>

        <ul className="space-y-1" aria-label="Setup progress">
          {generationSteps.map((label, i) => {
            const done = i < completedSteps;
            const active = i === completedSteps && !error && !showWelcome;
            const pending = i > completedSteps;

            return (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.18, ease: "easeOut" }}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors duration-300",
                  active && "bg-brand-core/10 dark:bg-brand-core/15",
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                    done || showWelcome ? "bg-foreground" : active ? "bg-brand-core/15" : "bg-muted",
                  )}
                >
                  <AnimatePresence mode="wait">
                    {done || showWelcome ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      >
                        <Check className="h-3 w-3 text-background stroke-[2.5]" />
                      </motion.span>
                    ) : active ? (
                      <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Loader2 className="h-3 w-3 text-brand-core animate-spin" />
                      </motion.span>
                    ) : (
                      <span key="dot" className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                    )}
                  </AnimatePresence>
                </span>

                <span
                  className={cn(
                    "text-[13px] transition-colors duration-300",
                    (done || showWelcome) && "text-foreground font-medium",
                    active && "text-brand-deep dark:text-brand-bright font-medium",
                    pending && !showWelcome && "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </motion.li>
            );
          })}
        </ul>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2"
            >
              <p className="text-[13px] text-destructive">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={runSetup}
                className="text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Try again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
