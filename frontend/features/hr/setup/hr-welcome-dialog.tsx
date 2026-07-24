"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
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
      <DialogContent className="max-w-sm">
        <div className="flex justify-center pt-2">
          <WelcomeIllustration className="h-32 w-32" />
        </div>
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle>Welcome to HRMS</DialogTitle>
          <DialogDescription>
            Let&apos;s get your HR workspace ready — organization profile, departments,
            leave policies, holidays, and more. It takes about 10 minutes, and you can
            pick up right where you left off.
          </DialogDescription>
        </DialogHeader>
        <p className="text-center text-xs font-medium text-muted-foreground tabular-nums">
          {completed} of {total} completed
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={handleStart}>
            Start Setup
          </Button>
          <div className="flex w-full gap-2">
            <LoadingButton
              variant="outline"
              className="flex-1"
              isPending={dismissTour.isPending}
              onClick={handleDismiss}
            >
              Remind Me Later
            </LoadingButton>
            <LoadingButton
              variant="ghost"
              className="flex-1 text-muted-foreground"
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
