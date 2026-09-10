"use client";

import { useState, useCallback, type ReactNode } from "react";
import {
  ClipboardCheck,
  LayoutDashboard,
  Send,
  Shield,
} from "lucide-react";
import { SendIcon } from "@animateicons/react/lucide";
import { completeOnboardingGate } from "@/lib/onboarding-gate";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSessionClaimsRefresh } from "@/hooks/common/auth-hooks";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  useBankDetailsMutation,
  usePersonalInfoMutation,
  useSubmitOnboardingMutation,
} from "@/lib/api/hooks/onboarding";
import { personalInfoSchema } from "@/lib/location/personal-info-validation";
import { CompletionCelebration } from "@/components/celebration/completion-celebration";
import { Button } from "@/components/ui/button";
import { useOnboardingRequirements } from "../hooks/use-onboarding-requirements";
import { buildBankDetailsSchema } from "../lib/bank-details-schema";
import { countryNameToCode } from "../lib/onboarding-requirements-schema";
import { DATA_STEP_IDS } from "../lib/constants";
import type { WizardDraft } from "../lib/wizard-draft-schema";
import {
  formatAddressBlock,
  formatPreviewDate,
  formatPreviewGender,
  maskAccountNumber,
  toPreviewSnapshot,
} from "../lib/preview-snapshot";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

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
  onEditPersonal: () => void;
  onEditBank: () => void;
};

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value || "Not provided"}</dd>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <dl className="divide-y divide-border/60 px-4">{children}</dl>
    </section>
  );
}

function maskSensitiveValue(value: string): string {
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 4) return compact;
  return `•••• ${compact.slice(-4)}`;
}

export function StepReview({
  completedSteps,
  draft,
  onBack,
  onEditPersonal,
  onEditBank,
}: StepReviewProps) {
  const { data: session } = useSession();
  const refreshSessionClaims = useSessionClaimsRefresh();
  const countryCode =
    draft.bank.countryCode || countryNameToCode(draft.personal.addressCountry);
  const { data: requirements } = useOnboardingRequirements(countryCode);
  const { mutateAsync: saveBank } = useBankDetailsMutation();
  const { mutateAsync: savePersonal } = usePersonalInfoMutation();
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
  const snapshot = toPreviewSnapshot(draft, {
    displayName: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    roleLabel,
  });
  const address = formatAddressBlock(snapshot);
  const emergencyContact = [
    draft.personal.emergencyName,
    draft.personal.emergencyRelation,
    draft.personal.emergencyPhone,
  ]
    .filter(Boolean)
    .join(" · ");
  const bankCode = draft.bank.iban || draft.bank.routingCode || draft.bank.swift;
  const statutoryRows = requirements?.statutoryFields
    .map((field) => ({
      label: field.label,
      value: maskSensitiveValue(draft.bank.statutory[field.key] ?? ""),
    }))
    .filter((row) => row.value) ?? [];

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

    const bankFormValues = {
      accountHolder: draft.bank.accountHolder,
      bankName: draft.bank.bankName,
      accountNumber: draft.bank.accountNumber,
      routingCode: draft.bank.routingCode,
      iban: draft.bank.iban,
      swift: draft.bank.swift,
      statutory: draft.bank.statutory ?? {},
    };

    if (requirements) {
      const bankParsed =
        buildBankDetailsSchema(requirements).safeParse(bankFormValues);
      if (!bankParsed.success) {
        toast.error(
          bankParsed.error.issues[0]?.message ?? "Bank details are incomplete",
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await savePersonal(personalParsed.data);
      await saveBank({ countryCode, ...bankFormValues });
      await submitOnboarding();
      await completeOnboardingGate(
        "onboarding-done",
        session?.user?.id ?? "",
        refreshSessionClaims,
      );
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
            nextLabel="Confirm & submit"
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
                <p className="mt-0.5 text-label leading-relaxed text-muted-foreground">
                  Review the sections below, then submit. HR will verify your
                  details and finish setting you up.
                </p>
              </div>
            </div>
          </div>

          <ReviewSection title="Personal details" onEdit={onEditPersonal}>
            <ReviewRow label="Phone" value={draft.personal.phone} />
            <ReviewRow
              label="Date of birth"
              value={formatPreviewDate(draft.personal.dateOfBirth)}
            />
            <ReviewRow
              label="Gender"
              value={formatPreviewGender(draft.personal.gender)}
            />
            <ReviewRow label="Home address" value={address} />
            <ReviewRow label="Emergency contact" value={emergencyContact} />
          </ReviewSection>

          <ReviewSection title="Bank and statutory details" onEdit={onEditBank}>
            <ReviewRow label="Account holder" value={draft.bank.accountHolder} />
            <ReviewRow label="Bank" value={draft.bank.bankName} />
            <ReviewRow
              label="Account number"
              value={maskAccountNumber(draft.bank.accountNumber)}
            />
            <ReviewRow
              label={snapshot.bankCodeLabel}
              value={bankCode}
            />
            {statutoryRows.map((row) => (
              <ReviewRow key={row.label} label={row.label} value={row.value} />
            ))}
          </ReviewSection>

          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <Shield className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-medium text-foreground">
              Assigned role: {roleLabel}
            </span>
          </div>

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
