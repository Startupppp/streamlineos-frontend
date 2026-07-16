"use client";

import { useState, useCallback } from "react";
import { Wrench } from "lucide-react";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetBody,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/billing/feature-gates";
import { SummaryCard } from "./summary-card";
import { RisksCard } from "./risks-card";
import { ClientUpdateCard } from "./client-update-card";
import { PlanCard } from "./plan-card";
import { ExtractTasksCard } from "./extract-tasks-card";
import { WeeklyUpdateCard } from "./weekly-update-card";
import { ChangeImpactCard } from "./change-impact-card";

interface AiToolsSharedProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

type AiToolsRailProps = AiToolsSharedProps;

interface ToolSection {
  id: string;
  label: string;
  description: string;
  content: React.ReactNode;
}

const TRIGGER_CLASS =
  "min-h-10 rounded-none px-3 py-2.5 text-[13px] font-medium hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/40 transition-colors";

const CONTENT_CLASS = "px-3 pb-3 pt-1";

function buildSections(sharedProps: AiToolsSharedProps): ToolSection[] {
  return [
    {
      id: "summary",
      label: "Summary",
      description: "AI-generated status overview",
      content: <SummaryCard {...sharedProps} />,
    },
    {
      id: "risks",
      label: "Risk Detection",
      description: "Identify blockers and threats early",
      content: <RisksCard {...sharedProps} />,
    },
    {
      id: "client",
      label: "Draft Client Update",
      description: "Client-safe status update",
      content: <ClientUpdateCard {...sharedProps} />,
    },
    {
      id: "plan",
      label: "Plan from Prompt",
      description: "Generate milestones and tasks from a goal",
      content: <PlanCard {...sharedProps} />,
    },
    {
      id: "extract",
      label: "Extract Tasks",
      description: "Extract action items from notes",
      content: <ExtractTasksCard {...sharedProps} />,
    },
    {
      id: "weekly-update",
      label: "Weekly Update Draft",
      description: "Draft a cited weekly status update",
      content: <WeeklyUpdateCard {...sharedProps} />,
    },
    {
      id: "change-impact",
      label: "Change Impact Brief",
      description: "Analyze scope, schedule & budget impact",
      content: <ChangeImpactCard {...sharedProps} />,
    },
  ];
}

interface ToolAccordionProps {
  sections: ToolSection[];
  triggerClassName?: string;
  contentClassName?: string;
}

function ToolAccordion({ sections, triggerClassName, contentClassName }: ToolAccordionProps) {
  return (
    <Accordion type="multiple" className="w-full">
      {sections.map(({ id, label, description, content }) => (
        <AccordionItem key={id} value={id} className="border-b border-border last:border-b-0">
          <AccordionTrigger className={triggerClassName ?? TRIGGER_CLASS}>
            <div className="flex flex-col items-start gap-0.5 text-left">
              <span className="text-foreground">{label}</span>
              <span className="text-[11px] font-normal text-muted-foreground">{description}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className={contentClassName ?? CONTENT_CLASS}>
            <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
              {content}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function ToolsHeader({
  onClose,
  showClose,
}: {
  onClose?: () => void;
  showClose?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] font-semibold text-foreground">AI Tools</span>
      </div>
      {showClose && onClose ? (
        <AnimatedIconButton
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Collapse AI tools panel"
          className="h-10 w-10 text-muted-foreground hover:text-foreground"
          icon={ChevronRightIcon}
          iconSize={16}
        />
      ) : null}
    </div>
  );
}

export function AiToolsMobileSheet({
  projectId,
  featureEnabled,
  requiredPlan,
}: AiToolsSharedProps) {
  const [open, setOpen] = useState(false);
  const sharedProps = { projectId, featureEnabled, requiredPlan };
  const sections = buildSections(sharedProps);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
  }, []);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 text-xs md:hidden"
          aria-label="Open AI tools"
        >
          <Wrench className="h-3.5 w-3.5" />
          Tools
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex h-[min(85dvh,100%)] max-h-[85dvh] w-full max-w-none flex-col gap-0 overflow-hidden p-0"
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-3 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            AI Tools
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="bg-card">
          <ToolAccordion
            sections={sections}
            triggerClassName={cn(TRIGGER_CLASS, "px-4")}
            contentClassName="px-4 pb-3 pt-1"
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function AiToolsRail({
  projectId,
  featureEnabled,
  requiredPlan,
}: AiToolsRailProps) {
  const [isOpen, setIsOpen] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const sharedProps = { projectId, featureEnabled, requiredPlan };
  const sections = buildSections(sharedProps);

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.aside
            key="rail-open"
            initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, x: 24 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.2, ease: "easeOut" }}
            className="flex h-full w-64 shrink-0 flex-col overflow-hidden border-l border-border bg-card lg:w-72 xl:w-80"
          >
            <ToolsHeader onClose={handleClose} showClose />
            <ScrollArea hideScrollbar className="min-h-0 flex-1 bg-card">
              <div className="overscroll-contain">
                <ToolAccordion sections={sections} />
              </div>
            </ScrollArea>
          </motion.aside>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.div
          key="rail-collapsed"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.15 }}
          className="flex shrink-0 flex-col items-center gap-1 border-l border-border bg-card px-1 py-2"
        >
          <AnimatedIconButton
            variant="ghost"
            size="icon"
            onClick={handleOpen}
            aria-label="Expand AI tools panel"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
            icon={ChevronLeftIcon}
            iconSize={16}
          />
          <Wrench className="h-3 w-3 text-muted-foreground" />
          <span
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            AI Tools
          </span>
        </motion.div>
      )}
    </>
  );
}
