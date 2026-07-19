"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Users,
  CalendarOff,
  ClipboardList,
  Briefcase,
  Wallet,
  Settings,
  RotateCcw,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  HrPageContent,
  HrPanel,
  HrHero,
  HrQuickAction,
  HrEmptyPanel,
  HrSectionHeader,
} from "@/features/hr/shared/hr-ui";
import { HrChecklistItem } from "@/features/hr/setup/hr-checklist-item";
import { HrSetupTourProvider, HrTakeTourButton } from "@/features/hr/setup/hr-setup-tour";
import { ConfettiOverlay } from "@/features/crm/deals/confetti-overlay";
import { useCan } from "@/hooks/api/access";
import {
  useModuleChecklist,
  useSkipChecklistItem,
  useRestartModuleChecklist,
  useDismissTour,
} from "@/hooks/api/onboarding-flow";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const HR_SETUP_TOUR_KEY = "hr_setup";

const COMPLETION_LINKS = [
  { href: "/hr", icon: Users, label: "HR dashboard", tone: "blue" as const },
  { href: "/hr/employees", icon: Users, label: "Employees", tone: "blue" as const },
  { href: "/hr/leaves", icon: CalendarOff, label: "Leave", tone: "amber" as const },
  { href: "/hr/attendance", icon: ClipboardList, label: "Attendance", tone: "emerald" as const },
  { href: "/hr/recruitment", icon: Briefcase, label: "Recruitment", tone: "violet" as const },
  { href: "/payroll", icon: Wallet, label: "Payroll", tone: "sky" as const },
  { href: "/hr/settings", icon: Settings, label: "HR settings", tone: "rose" as const },
];

function ChecklistSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

export function HrSetupClient() {
  const router = useRouter();
  const canManage = useCan("hr:employees:manage");
  const { data: checklist, isLoading, isError, refetch } = useModuleChecklist("HR");
  const skipItem = useSkipChecklistItem();
  const restartChecklist = useRestartModuleChecklist();
  const dismissTour = useDismissTour();

  async function handleSkip(itemKey: string) {
    try {
      await skipItem.mutateAsync({ moduleKey: "HR", itemKey });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleRestart() {
    try {
      await restartChecklist.mutateAsync("HR");
      toast.success("Setup restarted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleFinishLater() {
    try {
      await dismissTour.mutateAsync(HR_SETUP_TOUR_KEY);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      router.push("/hr");
    }
  }

  const sortedItems = checklist ? [...checklist.items].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const completedCount = sortedItems.filter((i) => i.status === "done").length;
  const skippedCount = sortedItems.filter((i) => i.status === "skipped").length;
  const isComplete = checklist?.status === "completed";

  const [showConfetti, setShowConfetti] = useState(false);
  const seenCompleteRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (isLoading) return;
    // Only celebrate a live transition into "completed" — never on a fresh page load that's
    // already done (e.g. revisiting on a later day).
    if (seenCompleteRef.current === false && isComplete) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReducedMotion) setShowConfetti(true);
    }
    seenCompleteRef.current = isComplete;
  }, [isComplete, isLoading]);

  return (
    <HrSetupTourProvider items={sortedItems}>
      {showConfetti && <ConfettiOverlay onDone={() => setShowConfetti(false)} />}
    <PageWrapper
      title="HR Setup"
      subtitle={
        isLoading
          ? undefined
          : isComplete
            ? "Your HR workspace is ready"
            : checklist
              ? `${completedCount} of ${sortedItems.length} steps complete`
              : undefined
      }
      actions={
        checklist && !isLoading ? (
          <div className="flex items-center gap-2">
            {!isComplete && <HrTakeTourButton />}
            {canManage && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRestart} disabled={restartChecklist.isPending}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Restart setup
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <HrPageContent>
        {isLoading ? (
          <ChecklistSkeleton />
        ) : isError ? (
          <HrEmptyPanel
            title="Couldn't load your setup checklist"
            description="Check your connection and try again."
            action={
              <Button size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        ) : !checklist ? (
          <HrEmptyPanel title="No setup checklist found" description="This organization may not have HR enabled yet." />
        ) : isComplete ? (
          <div className="space-y-5">
            <HrHero
              eyebrow="Setup complete"
              title="Your HR workspace is ready to go"
              description={`${completedCount} steps completed${skippedCount ? `, ${skippedCount} skipped` : ""}. Jump back into any of these anytime.`}
            >
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                All required steps done
              </div>
            </HrHero>
            <div>
              <HrSectionHeader title="Where to next" />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {COMPLETION_LINKS.map((link) => (
                  <HrQuickAction key={link.href} href={link.href} icon={link.icon} label={link.label} tone={link.tone} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <HrPanel>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {completedCount} of {sortedItems.length} completed
                </p>
                <span className="text-xs text-muted-foreground tabular-nums">{checklist.progress}%</span>
              </div>
              <Progress value={checklist.progress} className="mt-2 h-1.5" />
            </HrPanel>

            <ul className="space-y-3" role="list" aria-label="HR setup checklist">
              {sortedItems.map((item, index) => (
                <HrChecklistItem
                  key={item.itemKey}
                  item={item}
                  index={index}
                  onSkip={canManage ? handleSkip : undefined}
                  skipPending={skipItem.isPending}
                />
              ))}
            </ul>

            {canManage && (
              <div className="flex justify-end pt-2">
                <LoadingButton
                  variant="ghost"
                  className="text-muted-foreground"
                  isPending={dismissTour.isPending}
                  loadingText="Saving…"
                  onClick={handleFinishLater}
                >
                  Finish setup later
                </LoadingButton>
              </div>
            )}
          </div>
        )}
      </HrPageContent>
    </PageWrapper>
    </HrSetupTourProvider>
  );
}
