"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { Plan } from "@/lib/billing/feature-gates";
import { SummaryCard } from "./summary-card";
import { RisksCard } from "./risks-card";
import { ClientUpdateCard } from "./client-update-card";
import { PlanCard } from "./plan-card";
import { ExtractTasksCard } from "./extract-tasks-card";

interface AiToolsRailProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
  variant?: "sidebar" | "stacked";
}

interface ToolSection {
  id: string;
  label: string;
  description: string;
  content: React.ReactNode;
}

function buildSections(sharedProps: Omit<AiToolsRailProps, "variant">): ToolSection[] {
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
        <AccordionItem key={id} value={id}>
          <AccordionTrigger
            className={triggerClassName ?? "px-3 py-3 text-[13px] font-medium hover:no-underline hover:bg-muted/40 transition-colors rounded-none"}
          >
            <div className="flex flex-col items-start gap-0.5 text-left">
              <span>{label}</span>
              <span className="text-[11px] font-normal text-muted-foreground">{description}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className={contentClassName ?? "px-3 pb-3 pt-0"}>
            {content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function AiToolsRail({ projectId, featureEnabled, requiredPlan, variant = "sidebar" }: AiToolsRailProps) {
  const [isOpen, setIsOpen] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const sharedProps = { projectId, featureEnabled, requiredPlan };
  const sections = buildSections(sharedProps);

  if (variant === "stacked") {
    return (
      <div className="border-t border-border">
        <div className="flex items-center gap-2 py-3">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] font-semibold text-foreground">AI Tools</span>
        </div>
        <ToolAccordion
          sections={sections}
          triggerClassName="py-3 text-[13px] font-medium hover:no-underline hover:bg-muted/40 transition-colors rounded-none"
          contentClassName="pb-3 pt-0"
        />
      </div>
    );
  }

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
            className="flex flex-col shrink-0 w-80 xl:w-96 border-l border-border h-full overflow-hidden"
          >
            <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-semibold text-foreground">AI Tools</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Collapse AI tools panel"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <ToolAccordion sections={sections} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.div
          key="rail-collapsed"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.15 }}
          className="shrink-0 flex flex-col items-center border-l border-border py-2 px-1 gap-1"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpen}
            aria-label="Expand AI tools panel"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span
            className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            AI Tools
          </span>
        </motion.div>
      )}
    </>
  );
}
