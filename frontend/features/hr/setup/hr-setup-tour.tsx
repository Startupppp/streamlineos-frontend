"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { TourProvider, useTour, type StepType } from "@reactour/tour";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ModuleChecklistItem } from "@/hooks/api/onboarding-flow";
import { useSaveTourProgress } from "@/hooks/api/onboarding-flow";

const HR_SETUP_TOUR_KEY = "hr_setup";

function stepContent(item: ModuleChecklistItem) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-foreground">{item.title}</p>
      {item.description && (
        <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
      )}
    </div>
  );
}

function buildSteps(items: ModuleChecklistItem[]): StepType[] {
  return [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      selector: `[data-tour="hr-checklist-item-${item.itemKey}"]`,
      content: stepContent(item),
    }));
}

const tourStyles = {
  popover: (base: React.CSSProperties) => ({
    ...base,
    borderRadius: "1rem",
    backgroundColor: "var(--card)",
    color: "var(--card-foreground)",
    border: "1px solid var(--border)",
    boxShadow: "0 12px 32px -14px rgba(15,23,42,0.25)",
    padding: "1.25rem",
  }),
  badge: (base: React.CSSProperties) => ({
    ...base,
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
  }),
  dot: (base: React.CSSProperties, state?: { current?: boolean }) => ({
    ...base,
    backgroundColor: state?.current ? "var(--primary)" : "var(--border)",
  }),
  controls: (base: React.CSSProperties) => ({ ...base, marginTop: "1rem" }),
  arrow: (base: React.CSSProperties) => ({ ...base, color: "var(--foreground)" }),
  close: (base: React.CSSProperties) => ({ ...base, color: "var(--muted-foreground)" }),
};

/** Reads `?tour=1` (set by the welcome dialog's Start setup) and opens the tour once, then strips the param. */
function TourAutoStart({ ready }: { ready: boolean }) {
  const { setIsOpen, setCurrentStep } = useTour();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const saveProgress = useSaveTourProgress();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready || startedRef.current) return;
    if (searchParams.get("tour") !== "1") return;
    startedRef.current = true;
    setCurrentStep(0);
    setIsOpen(true);
    void saveProgress.mutateAsync({ tourKey: HR_SETUP_TOUR_KEY, currentStep: 0 });
    // Raw History API, not router.replace(): a Next.js router navigation here — even to the
    // "same" route minus a query param — re-renders everything under the useSearchParams()
    // Suspense boundary, which was wiping the isOpen state just set above before it ever
    // painted. This just cleans the URL bar with zero React side effects.
    window.history.replaceState(null, "", pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, searchParams]);

  return null;
}

/**
 * TourProvider only seeds its internal step registry from the `steps` prop on first mount — it
 * does not resync when a new array is passed on later renders. Since this provider first mounts
 * while the checklist is still loading (items=[]), the registry would otherwise stay empty
 * forever once the real items arrive. Keeps it in sync explicitly.
 */
function TourStepsSync({ steps }: { steps: StepType[] }) {
  const { setSteps } = useTour();
  useEffect(() => {
    setSteps?.(steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);
  return null;
}

/** Persists the current step to the backend whenever the tour is open and the step changes. */
function TourStepTracker() {
  const { currentStep, isOpen } = useTour();
  const saveProgress = useSaveTourProgress();
  const lastSaved = useRef(-1);

  useEffect(() => {
    if (!isOpen || currentStep === lastSaved.current) return;
    lastSaved.current = currentStep;
    void saveProgress.mutateAsync({ tourKey: HR_SETUP_TOUR_KEY, currentStep });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isOpen]);

  return null;
}

export function HrSetupTourProvider({
  items,
  children,
}: {
  items: ModuleChecklistItem[];
  children: ReactNode;
}) {
  const steps = buildSteps(items);
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <TourProvider
      steps={steps}
      styles={tourStyles}
      padding={{ mask: 8, popover: 12 }}
      scrollSmooth={!prefersReducedMotion}
      showBadge
      showCloseButton
      showNavigation
      showDots={steps.length <= 12}
      disableInteraction={false}
      onClickMask={({ setIsOpen }) => setIsOpen(false)}
    >
      <TourStepsSync steps={steps} />
      <TourStepTracker />
      <TourAutoStart ready={steps.length > 0} />
      {children}
    </TourProvider>
  );
}

export function HrTakeTourButton() {
  const { setIsOpen, setCurrentStep, steps } = useTour();

  if (steps.length === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => {
        setCurrentStep(0);
        setIsOpen(true);
      }}
    >
      <Compass className="h-3.5 w-3.5" aria-hidden="true" />
      Take the tour
    </Button>
  );
}
