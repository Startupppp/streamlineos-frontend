"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { WelcomeIllustration } from "@/components/illustrations";
import { useCan } from "@/hooks/api/access";
import { useModuleChecklist, useGuidedTours, useDismissTour } from "@/hooks/api/onboarding-flow";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const HR_SETUP_TOUR_KEY = "hr_setup";

export function HrWelcomeDialog() {
  const router = useRouter();
  const canView = useCan("hr:employees:view");
  const { data: checklist } = useModuleChecklist("HR", canView);
  const { data: tours } = useGuidedTours(canView);
  const dismissTour = useDismissTour();

  const tour = tours?.find((t) => t.tourKey === HR_SETUP_TOUR_KEY);
  const shouldShow =
    canView && !!checklist && checklist.status !== "completed" && !!tour && tour.progress === null;

  if (!shouldShow || !checklist) return null;

  const total = checklist.items.length;
  const completed = checklist.items.filter((i) => i.status === "done").length;

  function handleStart() {
    // The animated spotlight walkthrough auto-opens on /hr/setup (HrSetupTourProvider's
    // TourAutoStart reads this param and records the first saveProgress call itself).
    router.push("/hr/setup?tour=1");
  }

  async function handleDismiss() {
    try {
      await dismissTour.mutateAsync(HR_SETUP_TOUR_KEY);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) void handleDismiss();
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[min(92dvh,40rem)] gap-0 p-0 sm:max-w-sm md:max-h-[90dvh] md:p-0"
        showCloseButton={false}
      >
        <DialogBody className="flex flex-col gap-3 px-4 pb-2 pt-1 sm:gap-4 sm:px-6 sm:pt-2">
          <div className="flex justify-center">
            <WelcomeIllustration className="h-20 w-20 sm:h-28 sm:w-28 md:h-32 md:w-32" />
          </div>
          <DialogHeader className="gap-1.5 text-center sm:gap-2 sm:text-center">
            <DialogTitle className="text-base sm:text-lg">Welcome to HRMS</DialogTitle>
            <DialogDescription className="text-pretty text-sm leading-relaxed">
              <span className="sm:hidden">
                Set up your org profile, departments, leave policies, and holidays.
                About 10 minutes — you can resume anytime.
              </span>
              <span className="hidden sm:inline">
                Let&apos;s get your HR workspace ready — organization profile, departments,
                leave policies, holidays, and more. It takes about 10 minutes, and you can
                pick up right where you left off.
              </span>
            </DialogDescription>
          </DialogHeader>
          <p className="text-center text-xs font-medium tabular-nums text-muted-foreground">
            {completed} of {total} completed
          </p>
        </DialogBody>

        <DialogFooter className="flex-col gap-2 border-t border-border/60 bg-muted/20 px-4 py-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+3.75rem))] sm:flex-col sm:px-6 sm:pb-4 md:pb-4">
          <Button className="h-11 w-full sm:h-10" onClick={handleStart}>
            Start Setup
          </Button>
          <div className="flex w-full gap-2">
            <LoadingButton
              variant="outline"
              className="h-11 min-w-0 flex-1 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
              isPending={dismissTour.isPending}
              onClick={handleDismiss}
            >
              <span className="truncate">Remind Me Later</span>
            </LoadingButton>
            <LoadingButton
              variant="ghost"
              className="h-11 min-w-0 flex-1 px-2 text-xs text-muted-foreground sm:h-9 sm:px-3 sm:text-sm"
              isPending={dismissTour.isPending}
              onClick={handleDismiss}
            >
              Skip
            </LoadingButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
