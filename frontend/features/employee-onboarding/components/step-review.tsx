"use client";

import { useState, useCallback } from "react";
import {
  Check,
  ClipboardCheck,
  LayoutDashboard,
  Send,
  Shield,
} from "lucide-react";
import { SendIcon } from "@animateicons/react/lucide";
import { clearBackendTokenCache } from "@/lib/api-client";
import { completeOnboardingGate } from "@/lib/onboarding-gate";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  useBankDetailsMutation,
  usePersonalInfoMutation,
  useSubmitOnboardingMutation,
} from "@/lib/api/hooks/onboarding";
import { personalInfoSchema } from "@/lib/location/personal-info-validation";
import { CompletionCelebration } from "@/components/celebration/completion-celebration";
import { cn } from "@/lib/utils";
import { bankDetailsSchema } from "../lib/bank-details-schema";
import { DATA_STEP_IDS, STEP_TITLES, type StepId } from "../lib/constants";
import type { WizardDraft } from "../lib/wizard-draft-schema";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

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

const CELEBRATION_HIGHLIGHTS = [
  {
    icon: ClipboardCheck,
    label: "Profile, bank, and documents submitted",
  },
  {
    icon: Shield,
    label: "HR reviews and verifies your details",
  },
  {
    icon: LayoutDashboard,
    label: "Explore your dashboard while you wait",
  },
];

type StepReviewProps = {
  completedSteps: ReadonlySet<string>;
  draft: WizardDraft;
  onBack: () => void;
};

export function StepReview({
  completedSteps,
  draft,
  onBack,
}: StepReviewProps) {
  const { data: session, update } = useSession();
  const { mutateAsync: savePersonal } = usePersonalInfoMutation();
  const { mutateAsync: saveBank } = useBankDetailsMutation();
  const { mutateAsync: submitOnboarding } = useSubmitOnboardingMutation();
  const [showCelebration, setShowCelebration] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userRole = session?.user?.role ?? "ENGINEERING";
  const roleLabel = ROLE_LABELS[userRole] ?? userRole;
  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  const allDataStepsComplete = DATA_STEP_IDS.every((id) =>
    completedSteps.has(id),
  );

  const goToDashboard = useCallback(() => {
    if (isContinuing) return;
    setIsContinuing(true);
    window.location.replace("/dashboard");
  }, [isContinuing]);

  async function handleSubmit() {
    if (isSubmitting) return;

    const personalParsed = personalInfoSchema.safeParse({
      ...draft.personal,
      gender:
        draft.personal.gender === "MALE" ||
        draft.personal.gender === "FEMALE" ||
        draft.personal.gender === "OTHER"
          ? draft.personal.gender
          : undefined,
      emergencyRelation: draft.personal.emergencyRelation || undefined,
    });
    if (!personalParsed.success) {
      toast.error(
        personalParsed.error.issues[0]?.message ??
          "Personal details are incomplete",
      );
      return;
    }

    const bankParsed = bankDetailsSchema.safeParse({
      ...draft.bank,
      taxId: draft.bank.taxId.trim() ? draft.bank.taxId : undefined,
    });
    if (!bankParsed.success) {
      toast.error(
        bankParsed.error.issues[0]?.message ?? "Bank details are incomplete",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await savePersonal(personalParsed.data);
      await saveBank(bankParsed.data);
      await submitOnboarding();
      clearBackendTokenCache();
      await completeOnboardingGate("onboarding-done", update);
      setShowCelebration(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <StepBody
        footer={
          <NavButtons
            onBack={onBack}
            onNext={handleSubmit}
            nextLabel="Submit to HR"
            nextIcon={SendIcon}
            nextDisabled={!allDataStepsComplete}
            isPending={isSubmitting}
            loadingText="Submitting…"
          />
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                <Send className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Ready when you are
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                  Review the sections below, then submit. HR will verify your
                  details and finish setting you up.
                </p>
              </div>
            </div>
          </div>

          <ul className="space-y-2">
            {DATA_STEP_IDS.map((stepId: StepId) => {
              const isCompleted = completedSteps.has(stepId);
              return (
                <li
                  key={stepId}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                    isCompleted
                      ? "border-emerald-500/25 bg-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                      : "border-border/70 bg-muted/30",
                  )}
                >
                  {isCompleted ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-border"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isCompleted
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-muted-foreground",
                    )}
                  >
                    {STEP_TITLES[stepId]}
                  </span>
                  <span
                    className={cn(
                      "ml-auto text-xs",
                      isCompleted
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {isCompleted ? "Completed" : "Pending"}
                  </span>
                </li>
              );
            })}

            <li className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
              <Shield
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden
              />
              <span className="text-sm font-medium text-foreground">
                Role: {roleLabel}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                Assigned
              </span>
            </li>
          </ul>

          {!allDataStepsComplete ? (
            <p id="review-hint" className="text-xs text-muted-foreground">
              Complete the sections above to enable submit.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Default leave balances are allocated after submission.
            </p>
          )}
        </div>
      </StepBody>

      {showCelebration ? (
        <CompletionCelebration
          icon={ClipboardCheck}
          title={
            firstName ? `You're all set, ${firstName}!` : "You're all set!"
          }
          description="Your onboarding details are in. HR will review them and finish setting you up."
          highlights={CELEBRATION_HIGHLIGHTS}
          ctaLabel="Go to my dashboard"
          onContinue={goToDashboard}
          isContinuing={isContinuing}
          footnote="You can update your details anytime from your profile."
          autoAdvanceMs={10_000}
        />
      ) : null}
    </>
  );
}
