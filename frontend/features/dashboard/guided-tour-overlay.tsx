"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  useGuidedTours,
  useSaveTourProgress,
  useDismissTour,
  type GuidedTour,
} from "@/hooks/api/onboarding-flow";
import { getErrorMessage } from "@/lib/get-error-message";

function getStepTitle(v: unknown): string | null {
  if (typeof v !== "object" || v === null) return null;
  const t = (v as Record<string, unknown>).title;
  return typeof t === "string" ? t : null;
}

function getStepDescription(v: unknown): string | null {
  if (typeof v !== "object" || v === null) return null;
  const d = (v as Record<string, unknown>).description;
  return typeof d === "string" ? d : null;
}

function isTourStepObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

interface ActiveTourPanelProps {
  tour: GuidedTour;
  onDismiss: () => void;
}

function ActiveTourPanel({ tour, onDismiss }: ActiveTourPanelProps) {
  const saveTourProgress = useSaveTourProgress();
  const steps = tour.steps.filter(isTourStepObject);
  const currentStep = tour.progress?.currentStep ?? 0;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;
  const step = steps[currentStep] ?? steps[0];
  const stepTitle = getStepTitle(step);
  const stepDescription = getStepDescription(step);
  const { iconRef: closeIconRef, hoverHandlers: closeHoverHandlers } = useAnimatedIcon();

  const handleNext = useCallback(() => {
    const nextStep = currentStep + 1;
    saveTourProgress.mutate(
      { tourKey: tour.tourKey, currentStep: nextStep },
      { onError: (err) => toast.error(getErrorMessage(err)) },
    );
  }, [currentStep, saveTourProgress, tour.tourKey]);

  const handlePrev = useCallback(() => {
    if (currentStep <= 0) return;
    saveTourProgress.mutate(
      { tourKey: tour.tourKey, currentStep: currentStep - 1 },
      { onError: (err) => toast.error(getErrorMessage(err)) },
    );
  }, [currentStep, saveTourProgress, tour.tourKey]);

  const isLast = currentStep >= totalSteps - 1;

  if (!step) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="rounded-xl border border-border bg-card shadow-noir p-4 space-y-3"
      role="dialog"
      aria-modal="false"
      aria-label={`Guided tour: ${step.title ?? "Getting started"}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium tracking-wider uppercase text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </p>
          {stepTitle && (
            <p className="text-sm font-semibold mt-0.5">{stepTitle}</p>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          onClick={onDismiss}
          aria-label="Dismiss tour"
          {...closeHoverHandlers}
        >
          <XIcon ref={closeIconRef} size={14} />
        </button>
      </div>

      <Progress value={progress} className="h-1.5" aria-label={`Tour progress: ${progress}%`} />

      {stepDescription && (
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {stepDescription}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={currentStep <= 0 || saveTourProgress.isPending}
          onClick={handlePrev}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1"
          disabled={saveTourProgress.isPending}
          onClick={isLast ? onDismiss : handleNext}
        >
          {isLast ? "Finish" : "Next"}
          {!isLast && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        </Button>
      </div>
    </motion.div>
  );
}

export function GuidedTourOverlay() {
  const [activeTourKey, setActiveTourKey] = useState<string | null>(null);
  const { data: tours } = useGuidedTours();
  const dismissTour = useDismissTour();

  useEffect(() => {
    if (!tours) return;
    const active = tours.find(
      (t) =>
        t.progress?.status === "in_progress" ||
        t.progress?.status === "not_started",
    );
    if (active && !activeTourKey) setActiveTourKey(active.tourKey);
  }, [tours, activeTourKey]);

  const activeTour = tours?.find((t) => t.tourKey === activeTourKey) ?? null;

  const handleDismiss = useCallback(() => {
    if (!activeTourKey) return;
    dismissTour.mutate(activeTourKey, {
      onError: (err) => toast.error(getErrorMessage(err)),
    });
    setActiveTourKey(null);
  }, [activeTourKey, dismissTour]);

  if (!activeTour) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] md:bottom-6">
      <AnimatePresence mode="wait">
        {activeTour && (
          <ActiveTourPanel
            key={activeTour.tourKey}
            tour={activeTour}
            onDismiss={handleDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
